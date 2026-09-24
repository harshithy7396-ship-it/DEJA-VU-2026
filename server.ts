import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { INITIAL_CODERUSH_SETTINGS, DEFAULT_MONITORING_SETTINGS } from './src/data/mockData.js';
import {
  CodingProblem,
  CodeSubmission,
  SupportedLanguage,
  MonitoringEvent,
  TeamMonitoringStatus,
  MonitoringViolationSettings,
} from './src/types/competition.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

// -------------------------------------------------------------
// Judge0 Configuration & Language Mapping
// -------------------------------------------------------------
const JUDGE0_API_URL = (process.env.JUDGE0_API_URL || 'http://localhost:2358').replace(/\/+$/, '');
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN || '';

const LANGUAGE_TO_JUDGE0_ID: Record<SupportedLanguage, number> = {
  python: 71, // Python 3.8.1
  c: 50,      // C (GCC 9.2.0)
  cpp: 54,    // C++ (GCC 9.2.0)
  java: 62,   // Java (OpenJDK 13.0.1)
  r: 80,      // R (4.0.0)
};

// -------------------------------------------------------------
// In-Memory Server State (Authoritative)
// -------------------------------------------------------------
let problems: CodingProblem[] = JSON.parse(JSON.stringify(INITIAL_CODERUSH_SETTINGS.problems));
let submissions: CodeSubmission[] = [];

let round2State = {
  status: INITIAL_CODERUSH_SETTINGS.status,
  durationMinutes: INITIAL_CODERUSH_SETTINGS.durationMinutes,
  startTimestampMs: INITIAL_CODERUSH_SETTINGS.startTimestampMs,
  scoringMode: INITIAL_CODERUSH_SETTINGS.scoringMode,
  startTime: INITIAL_CODERUSH_SETTINGS.startTime,
  qualifiedTeamIds: [...INITIAL_CODERUSH_SETTINGS.qualifiedTeamIds],
  externalContestUrl: INITIAL_CODERUSH_SETTINGS.externalContestUrl,
};

// Rate limiting cache: key -> timestamp ms
const runRateLimits = new Map<string, number>();
const submitRateLimits = new Map<string, number>();

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of runRateLimits.entries()) {
    if (now - ts > 10000) runRateLimits.delete(key);
  }
  for (const [key, ts] of submitRateLimits.entries()) {
    if (now - ts > 10000) submitRateLimits.delete(key);
  }
}, 30000);

// Helper: Build Judge0 headers
function getJudge0Headers(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = JUDGE0_API_HOST;
  }
  if (JUDGE0_AUTH_TOKEN) {
    headers['X-Auth-Token'] = JUDGE0_AUTH_TOKEN;
  }
  return headers;
}

// -------------------------------------------------------------
// Judge0 Sandboxed Execution Client
// -------------------------------------------------------------
interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  compile_output: string;
  status: string;
  statusId: number;
  time: string;
  memory: string;
  judge0Connected: boolean;
  error?: string;
}

async function executeInSandbox(
  sourceCode: string,
  language: SupportedLanguage,
  stdin: string,
  timeLimitSec = 2.0,
  memoryLimitMb = 128
): Promise<SandboxExecutionResult> {
  const langId = LANGUAGE_TO_JUDGE0_ID[language] || 71;
  const memoryLimitKb = memoryLimitMb * 1024;

  const endpoint = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`;
  const headers = getJudge0Headers();

  const payload = {
    source_code: sourceCode,
    language_id: langId,
    stdin: stdin || '',
    cpu_time_limit: Math.min(Math.max(timeLimitSec, 0.5), 10.0),
    memory_limit: Math.min(Math.max(memoryLimitKb, 16000), 512000),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (timeLimitSec + 5) * 1000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      return {
        stdout: '',
        stderr: `Judge0 execution error (HTTP ${response.status}): ${errText}`,
        compile_output: '',
        status: 'Sandbox Error',
        statusId: 13,
        time: '0.00',
        memory: '0 KB',
        judge0Connected: true,
      };
    }

    const data = await response.json();
    const statusDesc = data.status?.description || 'Unknown Status';
    const statusId = data.status?.id || 13;

    return {
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      compile_output: data.compile_output || '',
      status: statusDesc,
      statusId: statusId,
      time: data.time ? `${parseFloat(data.time).toFixed(3)}s` : '0.00s',
      memory: data.memory ? `${(data.memory / 1024).toFixed(1)} MB` : '0.0 MB',
      judge0Connected: true,
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    const message = isTimeout
      ? 'Execution aborted: Judge0 request timed out.'
      : `Unable to reach Judge0 CE service at "${JUDGE0_API_URL}". ${err.message || ''}`;

    return {
      stdout: '',
      stderr: `${message}\n\nTo execute code in a real isolated sandbox, ensure Judge0 CE is running and JUDGE0_API_URL is configured in .env.`,
      compile_output: '',
      status: isTimeout ? 'Time Limit Exceeded' : 'Judge0 Offline',
      statusId: isTimeout ? 5 : 13,
      time: '0.00s',
      memory: '0.0 MB',
      judge0Connected: false,
      error: message,
    };
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Judge0 Health & Status Check
app.get('/api/code/status', async (req: Request, res: Response) => {
  let isReachable = false;
  try {
    const checkEndpoint = `${JUDGE0_API_URL}/about`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(checkEndpoint, { headers: getJudge0Headers(), signal: controller.signal });
    clearTimeout(timeout);
    isReachable = resp.ok;
  } catch {
    isReachable = false;
  }

  res.json({
    online: isReachable,
    apiUrl: JUDGE0_API_URL,
    supportedLanguages: Object.keys(LANGUAGE_TO_JUDGE0_ID),
    rateLimitRunSec: 1.5,
    rateLimitSubmitSec: 2.5,
  });
});

// 2. Public problem list (excludes hidden test case inputs and expected outputs)
app.get('/api/code/problems', (req: Request, res: Response) => {
  const safeProblems = problems.map((p) => {
    const { hiddenTestCases, ...safe } = p;
    return {
      ...safe,
      testCaseCount: hiddenTestCases?.length || 0,
    };
  });
  res.json(safeProblems);
});

// 3. Authoritative Round 2 State
app.get('/api/code/round-state', (req: Request, res: Response) => {
  // Check if active timer has expired
  if (round2State.status === 'ACTIVE' && round2State.startTimestampMs > 0) {
    const totalDurationMs = round2State.durationMinutes * 60 * 1000;
    const elapsed = Date.now() - round2State.startTimestampMs;
    if (elapsed >= totalDurationMs) {
      round2State.status = 'COMPLETED';
    }
  }

  res.json(round2State);
});

// 4. Run Code (Untrusted user stdin, single execution)
app.post('/api/code/run', async (req: Request, res: Response) => {
  const { teamId, language, sourceCode, stdin, timeLimitSeconds, memoryLimitMb } = req.body;

  if (!language || !LANGUAGE_TO_JUDGE0_ID[language as SupportedLanguage]) {
    res.status(400).json({ error: 'Unsupported language requested.' });
    return;
  }

  if (typeof sourceCode !== 'string' || sourceCode.length === 0) {
    res.status(400).json({ error: 'Source code cannot be empty.' });
    return;
  }

  // Safety limits: max 64KB source code, max 32KB input
  if (sourceCode.length > 65536) {
    res.status(400).json({ error: 'Source code exceeds maximum permitted size of 64 KB.' });
    return;
  }
  if (stdin && typeof stdin === 'string' && stdin.length > 32768) {
    res.status(400).json({ error: 'Standard input exceeds maximum permitted size of 32 KB.' });
    return;
  }

  // Rate Limiting: 1 run per 1.5 seconds per team / client
  const clientKey = `${teamId || req.ip}_run`;
  const lastRun = runRateLimits.get(clientKey) || 0;
  const now = Date.now();
  if (now - lastRun < 1500) {
    res.status(429).json({
      error: 'Rate limit exceeded: Please wait a moment before running code again.',
    });
    return;
  }
  runRateLimits.set(clientKey, now);

  const result = await executeInSandbox(
    sourceCode,
    language as SupportedLanguage,
    stdin || '',
    Number(timeLimitSeconds) || 2.0,
    Number(memoryLimitMb) || 128
  );

  res.json({
    success: true,
    stdout: result.stdout,
    stderr: result.stderr,
    compile_output: result.compile_output,
    status: result.status,
    time: result.time,
    memory: result.memory,
    judge0Connected: result.judge0Connected,
  });
});

// 5. Submit Code (Authoritative hidden test cases evaluation & score calculation)
app.post('/api/code/submit', async (req: Request, res: Response) => {
  const { teamId, teamName, problemId, language, sourceCode } = req.body;

  if (!teamId) {
    res.status(400).json({ error: 'Team ID is required.' });
    return;
  }

  // Timer & Status Verification
  if (round2State.status === 'LOCKED') {
    res.status(403).json({ error: 'Round 2 is currently locked by the organizers.' });
    return;
  }
  if (round2State.status === 'COMPLETED') {
    res.status(403).json({ error: 'Round 2 contest time has expired. Submissions are closed.' });
    return;
  }
  if (round2State.startTimestampMs > 0) {
    const totalDurationMs = round2State.durationMinutes * 60 * 1000;
    if (Date.now() - round2State.startTimestampMs >= totalDurationMs) {
      round2State.status = 'COMPLETED';
      res.status(403).json({ error: 'Contest time expired. Submissions are closed.' });
      return;
    }
  }

  const problem = problems.find((p) => p.id === problemId);
  if (!problem) {
    res.status(404).json({ error: `Problem ${problemId} not found.` });
    return;
  }

  if (!language || !LANGUAGE_TO_JUDGE0_ID[language as SupportedLanguage]) {
    res.status(400).json({ error: 'Unsupported programming language.' });
    return;
  }

  if (typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
    res.status(400).json({ error: 'Source code cannot be empty.' });
    return;
  }

  if (sourceCode.length > 65536) {
    res.status(400).json({ error: 'Source code exceeds maximum allowed size (64 KB).' });
    return;
  }

  // Rate Limiting: 1 submission per 2.5 seconds per team
  const submitKey = `${teamId}_submit`;
  const lastSubmit = submitRateLimits.get(submitKey) || 0;
  const now = Date.now();
  if (now - lastSubmit < 2500) {
    res.status(429).json({
      error: 'Please wait at least 2.5 seconds before submitting another solution.',
    });
    return;
  }
  submitRateLimits.set(submitKey, now);

  const testCases = problem.hiddenTestCases && problem.hiddenTestCases.length > 0
    ? problem.hiddenTestCases
    : problem.examples.map((ex, i) => ({ id: `ex_${i}`, input: ex.input, expectedOutput: ex.output }));

  const totalCount = testCases.length;
  let passedCount = 0;
  const testResults: {
    testCaseIndex: number;
    status: 'Passed' | 'Failed' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
    executionTime?: string;
    memory?: string;
  }[] = [];

  type SubmissionStatus = 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Compilation Error' | 'Runtime Error';
  let overallStatus: SubmissionStatus = 'Accepted';
  let firstFailedStatus: SubmissionStatus | null = null;

  // Grade each test case authoritatively
  for (let idx = 0; idx < testCases.length; idx++) {
    const tc = testCases[idx];
    const execResult = await executeInSandbox(
      sourceCode,
      language as SupportedLanguage,
      tc.input,
      problem.timeLimitSeconds || 2.0,
      problem.memoryLimitMb || 128
    );

    let caseStatus: 'Passed' | 'Failed' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error' = 'Failed';

    if (execResult.statusId === 6 || execResult.compile_output) {
      caseStatus = 'Compilation Error';
      if (!firstFailedStatus) firstFailedStatus = 'Compilation Error';
    } else if (execResult.statusId === 5 || execResult.status.includes('Time Limit')) {
      caseStatus = 'Time Limit Exceeded';
      if (!firstFailedStatus) firstFailedStatus = 'Time Limit Exceeded';
    } else if (execResult.statusId >= 7 && execResult.statusId <= 12) {
      caseStatus = 'Runtime Error';
      if (!firstFailedStatus) firstFailedStatus = 'Runtime Error';
    } else {
      // Clean and normalize strings for exact comparison
      const actual = execResult.stdout.trim().replace(/\r\n/g, '\n');
      const expected = tc.expectedOutput.trim().replace(/\r\n/g, '\n');

      if (actual === expected && actual.length > 0) {
        caseStatus = 'Passed';
        passedCount++;
      } else {
        caseStatus = 'Failed';
        if (!firstFailedStatus) firstFailedStatus = 'Wrong Answer';
      }
    }

    testResults.push({
      testCaseIndex: idx + 1,
      status: caseStatus,
      executionTime: execResult.time,
      memory: execResult.memory,
    });
  }

  if (passedCount === totalCount) {
    overallStatus = 'Accepted';
  } else {
    overallStatus = firstFailedStatus || 'Wrong Answer';
  }

  // Authoritative Score Calculation
  let calculatedScore = 0;
  if (round2State.scoringMode === 'all_or_nothing') {
    calculatedScore = passedCount === totalCount ? problem.points : 0;
  } else {
    // Partial scoring: score = Math.round(points * passed_tests / total_tests)
    calculatedScore = totalCount > 0 ? Math.round((problem.points * passedCount) / totalCount) : 0;
  }

  const submissionRecord: CodeSubmission = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teamId,
    teamName: teamName || `Team ${teamId}`,
    problemId: problem.id,
    problemName: problem.name,
    language: language as SupportedLanguage,
    sourceCode,
    submittedAt: Date.now(),
    status: overallStatus,
    score: calculatedScore,
    maxScore: problem.points,
    passedCount,
    totalCount,
    testResults,
  };

  submissions.unshift(submissionRecord);

  // Return ONLY safe grading metrics (No hidden inputs or expected outputs!)
  res.json({
    success: true,
    submissionId: submissionRecord.id,
    problemId: problem.id,
    problemName: problem.name,
    status: overallStatus,
    score: calculatedScore,
    maxScore: problem.points,
    passedCount,
    totalCount,
    testResults,
    submittedAt: submissionRecord.submittedAt,
  });
});

// 6. Submissions History
app.get('/api/code/submissions', (req: Request, res: Response) => {
  const { teamId, problemId } = req.query;
  let filtered = submissions;
  if (teamId && typeof teamId === 'string') {
    filtered = filtered.filter((s) => s.teamId.toLowerCase() === teamId.toLowerCase());
  }
  if (problemId && typeof problemId === 'string') {
    filtered = filtered.filter((s) => s.problemId === problemId);
  }
  res.json(filtered);
});

// 7. Admin: Update or Add Problem
app.post('/api/code/admin/problem', (req: Request, res: Response) => {
  const problemData: CodingProblem = req.body;
  if (!problemData.id || !problemData.name) {
    res.status(400).json({ error: 'Problem id and name are required.' });
    return;
  }

  const existingIdx = problems.findIndex((p) => p.id === problemData.id);
  if (existingIdx >= 0) {
    problems[existingIdx] = { ...problems[existingIdx], ...problemData };
  } else {
    problems.push(problemData);
  }

  res.json({ success: true, problems });
});

// 8. Admin: Delete Problem
app.delete('/api/code/admin/problem/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  problems = problems.filter((p) => p.id !== id);
  res.json({ success: true, problems });
});

// 9. Admin: Control Timer & Round 2 State
app.post('/api/code/admin/state', (req: Request, res: Response) => {
  const updates = req.body;
  round2State = { ...round2State, ...updates };
  res.json({ success: true, round2State });
});

// 10. Admin: Reset Submissions
app.post('/api/code/admin/reset-submissions', (req: Request, res: Response) => {
  submissions = [];
  res.json({ success: true, message: 'Submissions cleared.' });
});

// -------------------------------------------------------------
// Contest Mode & Anti-Cheating Monitoring Backend
// -------------------------------------------------------------
let monitoringSettings: MonitoringViolationSettings = { ...DEFAULT_MONITORING_SETTINGS };
const monitoringEvents: MonitoringEvent[] = [];
const teamMonitoringMap = new Map<string, TeamMonitoringStatus>();

// Log a monitoring event (e.g. CAMERA_INTERRUPTED, FULLSCREEN_EXIT, TAB_SWITCH)
app.post('/api/monitoring/event', (req: Request, res: Response) => {
  const { teamId, teamName, roundKey, type, details } = req.body;

  if (!teamId || !type) {
    res.status(400).json({ error: 'teamId and type are required.' });
    return;
  }

  const now = Date.now();
  const event: MonitoringEvent = {
    id: `ev_${now}_${Math.random().toString(36).substring(2, 6)}`,
    teamId,
    teamName: teamName || teamId,
    roundKey: roundKey || 'quiz',
    type,
    timestamp: now,
    details,
  };

  monitoringEvents.unshift(event);
  if (monitoringEvents.length > 500) {
    monitoringEvents.pop();
  }

  // Update aggregated team monitoring status
  const current = teamMonitoringMap.get(teamId) || {
    teamId,
    teamName: teamName || teamId,
    roundKey: roundKey || 'quiz',
    cameraStatus: 'CONNECTED',
    fullscreenStatus: 'ACTIVE',
    tabSwitchCount: 0,
    fullscreenExitCount: 0,
    warningCount: 0,
    lastActivityAt: now,
  };

  current.roundKey = roundKey || current.roundKey;
  current.lastActivityAt = now;

  if (type === 'CAMERA_CONNECTED') {
    current.cameraStatus = 'CONNECTED';
  } else if (type === 'CAMERA_INTERRUPTED') {
    current.cameraStatus = 'INTERRUPTED';
  } else if (type === 'FULLSCREEN_ENTER') {
    current.fullscreenStatus = 'ACTIVE';
  } else if (type === 'FULLSCREEN_EXIT') {
    current.fullscreenStatus = 'EXITED';
    current.fullscreenExitCount += 1;
    current.warningCount += 1;
  } else if (type === 'TAB_SWITCH') {
    current.tabSwitchCount += 1;
    current.warningCount += 1;
  }

  teamMonitoringMap.set(teamId, current);

  res.json({ success: true, event, status: current });
});

// Get all teams monitoring status for Admin Panel
app.get('/api/monitoring/teams', (req: Request, res: Response) => {
  res.json(Array.from(teamMonitoringMap.values()));
});

// Get recent monitoring events
app.get('/api/monitoring/events', (req: Request, res: Response) => {
  const { teamId } = req.query;
  let results = monitoringEvents;
  if (teamId && typeof teamId === 'string') {
    results = results.filter((e) => e.teamId.toLowerCase() === teamId.toLowerCase());
  }
  res.json(results.slice(0, 100));
});

// Get / Update monitoring violation settings
app.get('/api/monitoring/settings', (req: Request, res: Response) => {
  res.json(monitoringSettings);
});

app.post('/api/monitoring/settings', (req: Request, res: Response) => {
  monitoringSettings = { ...monitoringSettings, ...req.body };
  res.json({ success: true, settings: monitoringSettings });
});

// Reset monitoring logs
app.post('/api/monitoring/reset', (req: Request, res: Response) => {
  monitoringEvents.length = 0;
  teamMonitoringMap.clear();
  res.json({ success: true, message: 'Monitoring history cleared.' });
});

// Admin Security Authentication Endpoint
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'harshith2005';

app.post('/api/admin/login', (req: Request, res: Response) => {
  const { passcode } = req.body || {};
  if (typeof passcode === 'string' && passcode.trim() === ADMIN_PASSWORD) {
    return res.json({ success: true, message: 'Admin authenticated' });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
});


// -------------------------------------------------------------
// Vite Middleware / Static File Serving
// -------------------------------------------------------------
async function setupApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Déjà vu Server] Running on http://localhost:${PORT}`);
    console.log(`[Judge0 Endpoint] Configured at: ${JUDGE0_API_URL}`);
  });
}

setupApp().catch((err) => {
  console.error('[Déjà vu Server] Startup failed:', err);
  process.exit(1);
});
