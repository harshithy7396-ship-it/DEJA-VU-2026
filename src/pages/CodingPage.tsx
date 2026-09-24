import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCompetition } from '../context/CompetitionContext';
import { CodeEditor } from '../components/CodeEditor';
import { ContestModeGuard } from '../components/ContestModeGuard';
import {
  SupportedLanguage,
  CodingProblem,
  CodeSubmission,
  TestCaseResult,
} from '../types/competition';
import {
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Terminal,
  FileCode,
  History,
  ShieldAlert,
  Lock,
  ArrowLeft,
  Copy,
  Check,
  Cpu,
  Database,
  ExternalLink,
} from 'lucide-react';

interface CodingPageProps {
  onNavigate: (page: string) => void;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  python: 'Python (3.8+)',
  c: 'C (GCC 9.2)',
  cpp: 'C++ (GCC 9.2)',
  java: 'Java (OpenJDK 13)',
  r: 'R (4.0.0)',
};

export const CodingPage: React.FC<CodingPageProps> = ({ onNavigate }) => {
  const {
    currentTeam,
    codeRushSettings,
    getTeamRoundStatus,
    theme,
    submissions,
    addSubmissionRecord,
    getTeamCodeScore,
  } = useCompetition();

  const roundStatus = getTeamRoundStatus('coding', currentTeam.id);
  const isLocked = roundStatus === 'LOCKED';
  const isEliminated = roundStatus === 'ELIMINATED' || currentTeam.status === 'Eliminated';

  const problems = codeRushSettings.problems;
  const [selectedProblemId, setSelectedProblemId] = useState<string>(() => problems[0]?.id || 'P1');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('python');

  const selectedProblem = useMemo(() => {
    return problems.find((p) => p.id === selectedProblemId) || problems[0];
  }, [problems, selectedProblemId]);

  // Code state with per-problem & per-language cache
  const [sourceCode, setSourceCode] = useState<string>('');
  const [customStdin, setCustomStdin] = useState<string>('');
  const [activeBottomTab, setActiveBottomTab] = useState<'input' | 'output' | 'tests' | 'history'>('input');

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runOutput, setRunOutput] = useState<{
    stdout: string;
    stderr: string;
    compile_output: string;
    status: string;
    time: string;
    memory: string;
    judge0Connected?: boolean;
    error?: string;
  } | null>(null);

  const [lastSubmitResult, setLastSubmitResult] = useState<{
    status: string;
    score: number;
    maxScore: number;
    passedCount: number;
    totalCount: number;
    testResults: TestCaseResult[];
  } | null>(null);

  const [copiedExampleIdx, setCopiedExampleIdx] = useState<number | null>(null);
  const [viewSubmissionCode, setViewSubmissionCode] = useState<CodeSubmission | null>(null);

  // Judge0 status
  const [judge0Status, setJudge0Status] = useState<{ online: boolean; apiUrl: string } | null>(null);

  // Authoritative Timer calculation
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (codeRushSettings.startTimestampMs && codeRushSettings.startTimestampMs > 0) {
      const totalSec = codeRushSettings.durationMinutes * 60;
      const elapsedSec = Math.floor((Date.now() - codeRushSettings.startTimestampMs) / 1000);
      return Math.max(0, totalSec - elapsedSec);
    }
    return codeRushSettings.durationMinutes * 60;
  });

  const isTimeExpired = codeRushSettings.startTimestampMs > 0 && remainingSeconds <= 0;
  const isContestActive = codeRushSettings.status === 'ACTIVE' && !isTimeExpired;

  // Check Judge0 connectivity
  useEffect(() => {
    fetch('/api/code/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setJudge0Status({ online: data.online, apiUrl: data.apiUrl });
        }
      })
      .catch(() => {
        setJudge0Status({ online: false, apiUrl: 'offline' });
      });
  }, []);

  // Update timer every second based on authoritative start timestamp
  useEffect(() => {
    if (codeRushSettings.startTimestampMs && codeRushSettings.startTimestampMs > 0) {
      const updateTimer = () => {
        const totalSec = codeRushSettings.durationMinutes * 60;
        const elapsedSec = Math.floor((Date.now() - codeRushSettings.startTimestampMs) / 1000);
        const remaining = Math.max(0, totalSec - elapsedSec);
        setRemainingSeconds(remaining);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setRemainingSeconds(codeRushSettings.durationMinutes * 60);
    }
  }, [codeRushSettings.startTimestampMs, codeRushSettings.durationMinutes]);

  // Load/Save Code per problem & language
  const storageKey = `dejavu_code_${currentTeam.id}_${selectedProblem?.id}_${selectedLanguage}`;

  useEffect(() => {
    if (!selectedProblem) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null && saved.trim().length > 0) {
        setSourceCode(saved);
      } else {
        const template = selectedProblem.starterCode?.[selectedLanguage] || '';
        setSourceCode(template);
      }
    } catch {
      const template = selectedProblem.starterCode?.[selectedLanguage] || '';
      setSourceCode(template);
    }
  }, [selectedProblemId, selectedLanguage, storageKey, selectedProblem]);

  const handleCodeChange = (newCode: string) => {
    setSourceCode(newCode);
    try {
      localStorage.setItem(storageKey, newCode);
    } catch {}
  };

  const handleResetToTemplate = () => {
    if (!selectedProblem) return;
    const template = selectedProblem.starterCode?.[selectedLanguage] || '';
    setSourceCode(template);
    try {
      localStorage.setItem(storageKey, template);
    } catch {}
  };

  const copyExampleInput = (input: string, idx: number) => {
    setCustomStdin(input);
    setActiveBottomTab('input');
    setCopiedExampleIdx(idx);
    setTimeout(() => setCopiedExampleIdx(null), 2000);
  };

  // Run Code via backend execution API (/api/code/run)
  const handleRun = async () => {
    if (isRunning || isSubmitting || !selectedProblem) return;
    if (!isContestActive && codeRushSettings.startTimestampMs > 0 && isTimeExpired) {
      alert('The contest time has expired. Further code executions are closed.');
      return;
    }

    setIsRunning(true);
    setActiveBottomTab('output');
    setRunOutput({
      stdout: '',
      stderr: '',
      compile_output: '',
      status: 'Executing in sandbox...',
      time: '...',
      memory: '...',
    });

    try {
      const res = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: currentTeam.id,
          problemId: selectedProblem.id,
          language: selectedLanguage,
          sourceCode,
          stdin: customStdin,
          timeLimitSeconds: selectedProblem.timeLimitSeconds || 2.0,
          memoryLimitMb: selectedProblem.memoryLimitMb || 128,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRunOutput({
          stdout: '',
          stderr: data.error || 'Execution request failed.',
          compile_output: '',
          status: 'Error',
          time: '0.00s',
          memory: '0 MB',
          judge0Connected: false,
        });
      } else {
        setRunOutput({
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          compile_output: data.compile_output || '',
          status: data.status || 'Finished',
          time: data.time || '0.00s',
          memory: data.memory || '0 MB',
          judge0Connected: data.judge0Connected,
        });
      }
    } catch (err: any) {
      setRunOutput({
        stdout: '',
        stderr: `Failed to contact backend execution API: ${err.message}`,
        compile_output: '',
        status: 'Network Error',
        time: '0.00s',
        memory: '0 MB',
        judge0Connected: false,
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Code via backend grading API (/api/code/submit)
  const handleSubmit = async () => {
    if (isSubmitting || isRunning || !selectedProblem) return;
    if (!isContestActive && codeRushSettings.startTimestampMs > 0 && isTimeExpired) {
      alert('The contest time has expired. Submissions are closed.');
      return;
    }

    setIsSubmitting(true);
    setActiveBottomTab('tests');
    setLastSubmitResult(null);

    try {
      const res = await fetch('/api/code/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: currentTeam.id,
          teamName: currentTeam.name || `Team ${currentTeam.teamNumber}`,
          problemId: selectedProblem.id,
          language: selectedLanguage,
          sourceCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Submission failed.');
      } else {
        const result = {
          status: data.status,
          score: data.score,
          maxScore: data.maxScore,
          passedCount: data.passedCount,
          totalCount: data.totalCount,
          testResults: data.testResults || [],
        };
        setLastSubmitResult(result);

        const subRecord: CodeSubmission = {
          id: data.submissionId,
          teamId: currentTeam.id,
          teamName: currentTeam.name || `Team ${currentTeam.teamNumber}`,
          problemId: selectedProblem.id,
          problemName: selectedProblem.name,
          language: selectedLanguage,
          sourceCode,
          submittedAt: data.submittedAt || Date.now(),
          status: data.status,
          score: data.score,
          maxScore: data.maxScore,
          passedCount: data.passedCount,
          totalCount: data.totalCount,
          testResults: data.testResults,
        };
        addSubmissionRecord(subRecord);
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate highest score for each problem for this team
  const problemScores = useMemo(() => {
    const scores: Record<string, number> = {};
    const teamSubs = submissions.filter((s) => s.teamId.toLowerCase() === currentTeam.id.toLowerCase());
    for (const sub of teamSubs) {
      if (!scores[sub.problemId] || sub.score > scores[sub.problemId]) {
        scores[sub.problemId] = sub.score;
      }
    }
    return scores;
  }, [submissions, currentTeam.id]);

  const teamTotalCodeScore = getTeamCodeScore(currentTeam.id);

  // Filter submissions for current team
  const teamSubmissions = useMemo(() => {
    return submissions.filter((s) => s.teamId.toLowerCase() === currentTeam.id.toLowerCase());
  }, [submissions, currentTeam.id]);

  // Format timer
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Restricted Access View
  if (isLocked || isEliminated) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 text-center">
        <div className="p-8 max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm">
          {isEliminated ? (
            <>
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">Round 2 Access Restricted</h2>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                Thank you for your contribution to Déjà vu – Technical Event.
              </p>
              <p className="text-xs text-neutral-500 mb-6">
                Only qualifying teams advancing from Round 1 proceed to Round 2.
              </p>
            </>
          ) : (
            <>
              <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">Round 2 (CodeRush) is Locked</h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-6">
                The coding round has not yet been unlocked by the contest organizers.
              </p>
            </>
          )}
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full py-2.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 transition cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <ContestModeGuard
      roundKey="coding"
      roundTitle="Round 2: CodeRush Coding Contest"
      roundDuration={`${codeRushSettings.durationMinutes} Minutes`}
      onExit={() => onNavigate('dashboard')}
      isCompleted={codeRushSettings.status === 'COMPLETED'}
    >
      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 py-4 flex flex-col gap-4 min-h-[calc(100vh-5rem)]">
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer border border-neutral-200 dark:border-neutral-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-neutral-950 dark:text-white uppercase tracking-tight">
                Déjà vu — CodeRush
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-widest">
                Round 2
              </span>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Team: <strong className="text-neutral-900 dark:text-neutral-200">{currentTeam.name || `Team ${currentTeam.teamNumber}`}</strong> ({currentTeam.id})
            </div>
          </div>
        </div>

        {/* Right Info: Judge0 status, Score, Timer */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Judge0 Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
            <Cpu className="w-3 h-3 text-amber-500" />
            <span>Sandbox:</span>
            {judge0Status?.online ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Judge0 Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold" title={judge0Status?.apiUrl}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Standby
              </span>
            )}
          </div>

          {/* Current Score */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300">
            <span className="text-xs font-semibold">Score:</span>
            <span className="font-mono text-sm font-black">{teamTotalCodeScore} pts</span>
          </div>

          {/* Authoritative Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono text-sm font-bold shadow-xs ${
              isTimeExpired
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                : remainingSeconds <= 300
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 animate-pulse'
                : 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>{isTimeExpired ? '00:00 (Time Expired)' : formatTime(remainingSeconds)}</span>
          </div>
        </div>
      </header>

      {/* Main Content: Left Problem Statement & Right Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* LEFT COLUMN: Problem List & Problem Statement */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Problem Selector Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {problems.map((prob, idx) => {
              const bestScore = problemScores[prob.id] ?? 0;
              const isSelected = prob.id === selectedProblemId;
              const isFullScore = bestScore === prob.points;
              const isPartialScore = bestScore > 0 && bestScore < prob.points;

              return (
                <button
                  key={prob.id}
                  onClick={() => setSelectedProblemId(prob.id)}
                  className={`flex-1 min-w-[130px] p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white dark:bg-neutral-900 border-amber-500 shadow-xs'
                      : 'bg-neutral-50 dark:bg-neutral-950/60 border-neutral-200 dark:border-neutral-800 hover:bg-white dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Problem {idx + 1}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        prob.difficulty === 'Easy'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : prob.difficulty === 'Medium'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {prob.difficulty}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {prob.name}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-neutral-400">{prob.points} pts</span>
                    {isFullScore ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        {bestScore}/{prob.points}
                      </span>
                    ) : isPartialScore ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        {bestScore}/{prob.points}
                      </span>
                    ) : (
                      <span className="text-neutral-400">0/{prob.points}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Problem Statement Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 overflow-y-auto max-h-[720px] shadow-xs flex-1">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      selectedProblem.difficulty === 'Easy'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : selectedProblem.difficulty === 'Medium'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {selectedProblem.difficulty}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {selectedProblem.points} Points
                  </span>
                </div>
                <h2 className="text-lg font-black text-neutral-950 dark:text-white">
                  {selectedProblem.name}
                </h2>
              </div>

              <div className="text-right text-[11px] font-mono text-neutral-400">
                <div>Time: {selectedProblem.timeLimit}</div>
                <div>Mem: {selectedProblem.memoryLimit}</div>
              </div>
            </div>

            {/* Description */}
            <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 space-y-4">
              <div>
                <h4 className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  Statement
                </h4>
                <p className="whitespace-pre-line">{selectedProblem.description}</p>
              </div>

              {selectedProblem.inputFormat && (
                <div>
                  <h4 className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                    Input Format
                  </h4>
                  <p className="whitespace-pre-line bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 font-mono text-[11px]">
                    {selectedProblem.inputFormat}
                  </p>
                </div>
              )}

              {selectedProblem.outputFormat && (
                <div>
                  <h4 className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                    Output Format
                  </h4>
                  <p className="whitespace-pre-line bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 font-mono text-[11px]">
                    {selectedProblem.outputFormat}
                  </p>
                </div>
              )}

              {selectedProblem.constraints && (
                <div>
                  <h4 className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                    Constraints
                  </h4>
                  <p className="whitespace-pre-line bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 font-mono text-[11px]">
                    {selectedProblem.constraints}
                  </p>
                </div>
              )}

              {/* Visible Examples */}
              <div>
                <h4 className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-2">
                  Sample Examples
                </h4>
                <div className="space-y-3">
                  {selectedProblem.examples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          Example {idx + 1}
                        </span>
                        <button
                          onClick={() => copyExampleInput(ex.input, idx)}
                          className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          {copiedExampleIdx === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>Copied to Input</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Input</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div>
                        <div className="text-[10px] text-neutral-400 font-semibold uppercase">Input:</div>
                        <pre className="font-mono text-[11px] bg-white dark:bg-neutral-900 p-2 rounded border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
                          {ex.input}
                        </pre>
                      </div>

                      <div>
                        <div className="text-[10px] text-neutral-400 font-semibold uppercase">Output:</div>
                        <pre className="font-mono text-[11px] bg-white dark:bg-neutral-900 p-2 rounded border border-neutral-200 dark:border-neutral-800 overflow-x-auto text-emerald-600 dark:text-emerald-400">
                          {ex.output}
                        </pre>
                      </div>

                      {ex.explanation && (
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 italic">
                          Explanation: {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Monaco Code Editor + Controls + Output/Tests Tabs */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Editor Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
                className="px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>

              <button
                onClick={handleResetToTemplate}
                title="Reset code to default template"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            {/* Run & Submit Action Buttons */}
            <div className="flex items-center gap-2">
              {/* [ RUN ] */}
              <button
                onClick={handleRun}
                disabled={isRunning || isSubmitting || isTimeExpired}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 font-bold text-xs transition cursor-pointer border border-neutral-300 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isRunning ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-emerald-500" />
                    <span>RUN</span>
                  </>
                )}
              </button>

              {/* [ SUBMIT ] */}
              <button
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting || isTimeExpired}
                className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>SUBMIT</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Code Editor Area */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[380px]">
            <CodeEditor
              value={sourceCode}
              onChange={handleCodeChange}
              language={selectedLanguage}
              theme={theme}
              readOnly={isTimeExpired}
              onRun={handleRun}
            />
          </div>

          {/* BOTTOM TABS: Custom Input, Output, Submission Tests, Submission History */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[220px]">
            {/* Tabs Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-3 bg-neutral-50 dark:bg-neutral-950">
              <div className="flex gap-1 py-1.5">
                <button
                  onClick={() => setActiveBottomTab('input')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeBottomTab === 'input'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs font-bold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Custom Input</span>
                </button>

                <button
                  onClick={() => setActiveBottomTab('output')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeBottomTab === 'output'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs font-bold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Output</span>
                  {runOutput && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        runOutput.stderr ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>

                <button
                  onClick={() => setActiveBottomTab('tests')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeBottomTab === 'tests'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs font-bold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Test Results</span>
                  {lastSubmitResult && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                      {lastSubmitResult.passedCount}/{lastSubmitResult.totalCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveBottomTab('history')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    activeBottomTab === 'history'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs font-bold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History ({teamSubmissions.length})</span>
                </button>
              </div>

              {activeBottomTab === 'output' && runOutput && (
                <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2">
                  <span>Status: <strong className="text-neutral-700 dark:text-neutral-200">{runOutput.status}</strong></span>
                  <span>Time: {runOutput.time}</span>
                  <span>Mem: {runOutput.memory}</span>
                </div>
              )}
            </div>

            {/* Tab Contents */}
            <div className="p-3 flex-1 overflow-y-auto max-h-[260px] font-mono text-xs">
              {/* TAB 1: Custom Input */}
              {activeBottomTab === 'input' && (
                <div className="flex flex-col h-full gap-2">
                  <div className="text-[11px] text-neutral-400 font-sans">
                    Enter custom standard input (stdin) for testing with [ RUN ]:
                  </div>
                  <textarea
                    value={customStdin}
                    onChange={(e) => setCustomStdin(e.target.value)}
                    placeholder="Enter input here..."
                    className="w-full flex-1 min-h-[120px] p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-amber-500 font-mono text-xs resize-none text-neutral-900 dark:text-white"
                  />
                </div>
              )}

              {/* TAB 2: Execution Output */}
              {activeBottomTab === 'output' && (
                <div>
                  {!runOutput ? (
                    <div className="text-neutral-400 italic text-center py-6 font-sans">
                      Click [ RUN ] to execute code with custom input in the sandbox.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {runOutput.compile_output && (
                        <div>
                          <div className="text-rose-500 font-bold mb-1 flex items-center gap-1 font-sans">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Compilation Output:</span>
                          </div>
                          <pre className="p-3 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-pre-wrap overflow-x-auto text-[11px]">
                            {runOutput.compile_output}
                          </pre>
                        </div>
                      )}

                      {runOutput.stderr && (
                        <div>
                          <div className="text-rose-500 font-bold mb-1 font-sans">Standard Error / Notice:</div>
                          <pre className="p-3 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-pre-wrap overflow-x-auto text-[11px]">
                            {runOutput.stderr}
                          </pre>
                        </div>
                      )}

                      <div>
                        <div className="text-neutral-500 dark:text-neutral-400 font-bold mb-1 font-sans">Standard Output:</div>
                        <pre className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-emerald-400 border border-neutral-200 dark:border-neutral-800 whitespace-pre-wrap overflow-x-auto text-[11px]">
                          {runOutput.stdout || (runOutput.stderr ? '' : '(No output returned)')}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Test Results (Graded Hidden Tests) */}
              {activeBottomTab === 'tests' && (
                <div>
                  {!lastSubmitResult ? (
                    <div className="text-neutral-400 italic text-center py-6 font-sans">
                      Click [ SUBMIT ] to authoritatively grade your code against all hidden test cases.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Summary Banner */}
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between font-sans ${
                          lastSubmitResult.status === 'Accepted'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {lastSubmitResult.status === 'Accepted' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          )}
                          <div>
                            <div className="font-black text-sm">
                              {lastSubmitResult.status}
                            </div>
                            <div className="text-xs">
                              Passed {lastSubmitResult.passedCount} of {lastSubmitResult.totalCount} test cases
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs uppercase font-semibold text-neutral-500">Awarded:</span>
                          <div className="text-lg font-black font-mono">
                            {lastSubmitResult.score} / {lastSubmitResult.maxScore} pts
                          </div>
                        </div>
                      </div>

                      {/* Test Case Breakdown (Clean, Secure: No hidden inputs or outputs exposed!) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {lastSubmitResult.testResults.map((tc) => (
                          <div
                            key={tc.testCaseIndex}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                              tc.status === 'Passed'
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold mb-1">
                              <span>Test {tc.testCaseIndex}</span>
                              {tc.status === 'Passed' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              )}
                            </div>
                            <div className="text-[11px] font-semibold">{tc.status}</div>
                            {tc.executionTime && (
                              <div className="text-[10px] text-neutral-400 mt-1 font-mono">
                                {tc.executionTime}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Submission History */}
              {activeBottomTab === 'history' && (
                <div>
                  {teamSubmissions.length === 0 ? (
                    <div className="text-neutral-400 italic text-center py-6 font-sans">
                      No submissions recorded yet for this team.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 text-[11px] uppercase">
                            <th className="py-1.5 px-2">Problem</th>
                            <th className="py-1.5 px-2">Language</th>
                            <th className="py-1.5 px-2">Status</th>
                            <th className="py-1.5 px-2">Score</th>
                            <th className="py-1.5 px-2">Passed</th>
                            <th className="py-1.5 px-2">Time</th>
                            <th className="py-1.5 px-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {teamSubmissions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-950/60">
                              <td className="py-2 px-2 font-bold text-neutral-900 dark:text-white">
                                {sub.problemName}
                              </td>
                              <td className="py-2 px-2 uppercase font-mono text-[11px] text-neutral-500">
                                {sub.language}
                              </td>
                              <td className="py-2 px-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    sub.status === 'Accepted'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {sub.status}
                                </span>
                              </td>
                              <td className="py-2 px-2 font-mono font-bold text-neutral-900 dark:text-white">
                                {sub.score} / {sub.maxScore}
                              </td>
                              <td className="py-2 px-2 font-mono text-neutral-500">
                                {sub.passedCount} / {sub.totalCount}
                              </td>
                              <td className="py-2 px-2 text-neutral-400 text-[11px]">
                                {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                              <td className="py-2 px-2 text-right">
                                <button
                                  onClick={() => setViewSubmissionCode(sub)}
                                  className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-semibold"
                                >
                                  View Code
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Submitted Code Modal */}
      {viewSubmissionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                  Submission Code ({viewSubmissionCode.problemName})
                </h3>
                <div className="text-xs text-neutral-400">
                  {viewSubmissionCode.language.toUpperCase()} • Score: {viewSubmissionCode.score}/{viewSubmissionCode.maxScore} • {new Date(viewSubmissionCode.submittedAt).toLocaleTimeString()}
                </div>
              </div>
              <button
                onClick={() => setViewSubmissionCode(null)}
                className="px-3 py-1 rounded-lg text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Close
              </button>
            </div>
            <pre className="flex-1 p-4 bg-neutral-950 text-emerald-400 font-mono text-xs rounded-xl overflow-auto border border-neutral-800">
              {viewSubmissionCode.sourceCode}
            </pre>
          </div>
        </div>
      )}
      </div>
    </ContestModeGuard>
  );
};
