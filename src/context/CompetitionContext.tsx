import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Team,
  RoundInfo,
  QuizQuestion,
  ParticipantQuizQuestion,
  TeamQuizSession,
  CodingProblem,
  CodeSubmission,
  CodeBidRiddle,
  RoundStatus,
  QuizSettings,
  CodeRushSettings,
  CodeBidSettings,
  LeaderboardSettings,
  Theme,
  MonitoringEvent,
  TeamMonitoringStatus,
  MonitoringViolationSettings,
} from '../types/competition';
import {
  INITIAL_TEAMS,
  INITIAL_ROUNDS,
  INITIAL_QUIZ_SETTINGS,
  INITIAL_CODERUSH_SETTINGS,
  INITIAL_CODEBID_SETTINGS,
  INITIAL_LEADERBOARD_SETTINGS,
  DEFAULT_MONITORING_SETTINGS,
  MOCK_QUIZ_QUESTIONS,
  MOCK_CODEBID_RIDDLES,
  TIE_BREAKER_RIDDLE,
} from '../data/mockData';

interface CompetitionContextType {
  // Theme
  theme: Theme;
  toggleTheme: () => void;

  // Authentication & Team state
  teams: Team[];
  currentTeam: Team;
  currentTeamId: string;
  isTeamLoggedIn: boolean;
  isAdmin: boolean;
  loginTeam: (teamId: string, passcode: string) => { success: boolean; message: string };
  logoutTeam: () => void;
  loginAdmin: (passcode: string) => Promise<boolean>;
  logoutAdmin: () => void;

  // Admin Team Management
  updateTeam: (teamId: string, updates: Partial<Team>) => { success: boolean; error?: string };
  registerTeamSlot: (
    teamNumber: number,
    name: string,
    members: string[],
    passcode?: string,
    department?: string,
    customId?: string
  ) => { success: boolean; error?: string };
  deleteTeamSlot: (teamId: string) => void;
  toggleTeamStatus: (teamId: string) => void;
  changeTeamPassword: (teamId: string, newPasscode: string) => void;
  overrideQualification: (teamId: string, roundKey: 'quiz' | 'coding' | 'bidding', qualify: boolean) => void;
  importTeamsFromCsv: (csvContent: string) => { success: boolean; count: number; error?: string };
  exportTeamsToCsv: () => string;
  generateTeamCredentials: (teamNumber: number) => { teamId: string; passcode: string };

  // Contest Mode & Monitoring
  monitoringSettings: MonitoringViolationSettings;
  updateMonitoringSettings: (settings: Partial<MonitoringViolationSettings>) => void;
  monitoringEvents: MonitoringEvent[];
  teamMonitoringStatus: Record<string, TeamMonitoringStatus>;
  logMonitoringEvent: (event: Omit<MonitoringEvent, 'id' | 'timestamp'>) => void;
  updateTeamMonitoringState: (teamId: string, updates: Partial<TeamMonitoringStatus>) => void;
  isContestModeActive: boolean;
  activeContestRound: 'quiz' | 'coding' | 'bidding' | null;
  enterContestMode: (round: 'quiz' | 'coding' | 'bidding') => void;
  exitContestMode: () => void;

  // Rounds
  rounds: RoundInfo[];
  setRoundStatus: (roundKey: 'quiz' | 'coding' | 'bidding', status: RoundStatus) => void;
  updateRoundRules: (roundKey: 'quiz' | 'coding' | 'bidding', rules: string[]) => void;
  getTeamRoundStatus: (roundKey: 'quiz' | 'coding' | 'bidding', teamId?: string) => RoundStatus;
  isRoundLockedForTeam: (roundKey: 'quiz' | 'coding' | 'bidding') => boolean;

  // Round 1 (Quiz)
  quizQuestions: QuizQuestion[];
  quizSettings: QuizSettings;
  updateQuizSettings: (settings: Partial<QuizSettings>) => void;
  addQuizQuestion: (q: Omit<QuizQuestion, 'id'>) => void;
  editQuizQuestion: (id: number, q: Partial<QuizQuestion>) => void;
  deleteQuizQuestion: (id: number) => void;
  
  // Quiz Session (Persistent, Anti-Cheat, Non-Resetting)
  getQuizSession: (teamId?: string) => TeamQuizSession;
  startQuizSession: (teamId?: string) => TeamQuizSession;
  recordQuizAnswer: (questionId: number, chosenOptionIndex: number) => void;
  advanceQuizQuestion: (chosenOptionIndex?: number) => TeamQuizSession;
  finishQuizSession: () => { score: number; total: number };
  resetQuizSession: (teamId?: string) => void;

  // Round 2 (CodeRush)
  codeRushSettings: CodeRushSettings;
  updateCodeRushSettings: (settings: Partial<CodeRushSettings>) => void;
  addCodingProblem: (problem: CodingProblem) => void;
  editCodingProblem: (problemId: string, updates: Partial<CodingProblem>) => void;
  deleteCodingProblem: (problemId: string) => void;
  submissions: CodeSubmission[];
  addSubmissionRecord: (sub: CodeSubmission) => void;
  startRound2Timer: (durationMinutes?: number) => void;
  pauseRound2Timer: () => void;
  resetRound2Timer: () => void;
  setRound2ScoringMode: (mode: 'partial' | 'all_or_nothing') => void;
  getTeamCodeScore: (teamId?: string) => number;
  computeRound2Elimination: () => { top5: Team[]; eliminated: Team[] };

  // Round 3 (CodeBid)
  codeBidSettings: CodeBidSettings;
  updateCodeBidSettings: (settings: Partial<CodeBidSettings>) => void;
  riddles: CodeBidRiddle[];
  currentRiddle: CodeBidRiddle;
  placeBid: (amount: number) => { success: boolean; message: string };
  startAuction: () => void;
  pauseAuction: () => void;
  closeAuction: () => void;
  revealHighestBidder: () => void;
  markSolvingResult: (isCorrect: boolean) => void;
  passToNextBidder: () => void;
  nextRiddle: () => void;
  startTieBreaker: (customRiddleText?: string, customAnswer?: string) => void;
  editRiddle: (id: string, updates: Partial<CodeBidRiddle>) => void;

  // Leaderboard
  leaderboardSettings: LeaderboardSettings;
  updateLeaderboardSettings: (settings: Partial<LeaderboardSettings>) => void;

  // Global reset
  resetCompetitionData: () => void;
}

const CompetitionContext = createContext<CompetitionContextType | undefined>(undefined);

// Deterministic seed generation
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const CompetitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Theme State (Light mode is the default)
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('dejavu_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('dejavu_theme', next);
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // 2. Teams
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem('dejavu_teams_v4');
      return saved ? JSON.parse(saved) : INITIAL_TEAMS;
    } catch {
      return INITIAL_TEAMS;
    }
  });

  // Logged in team
  const [currentTeamId, setCurrentTeamId] = useState<string>(() => {
    try {
      return localStorage.getItem('dejavu_current_team_v4') || 'T01';
    } catch {
      return 'T01';
    }
  });

  const [isTeamLoggedIn, setIsTeamLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dejavu_team_logged_in_v4') === 'true';
    } catch {
      return true; // default demo logged in as T01
    }
  });

  // Admin authentication (passcode: harshith2005)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dejavu_is_admin_v4') === 'true';
    } catch {
      return false;
    }
  });

  // 3. Rounds
  const [rounds, setRounds] = useState<RoundInfo[]>(() => {
    try {
      const saved = localStorage.getItem('dejavu_rounds_v4');
      return saved ? JSON.parse(saved) : INITIAL_ROUNDS;
    } catch {
      return INITIAL_ROUNDS;
    }
  });

  // 4. Quiz (Round 1)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() => {
    try {
      const saved = localStorage.getItem('dejavu_quiz_questions_v4');
      return saved ? JSON.parse(saved) : MOCK_QUIZ_QUESTIONS;
    } catch {
      return MOCK_QUIZ_QUESTIONS;
    }
  });

  const [quizSettings, setQuizSettings] = useState<QuizSettings>(() => {
    try {
      const saved = localStorage.getItem('dejavu_quiz_settings_v4');
      return saved ? JSON.parse(saved) : INITIAL_QUIZ_SETTINGS;
    } catch {
      return INITIAL_QUIZ_SETTINGS;
    }
  });

  // 5. CodeRush (Round 2)
  const [codeRushSettings, setCodeRushSettings] = useState<CodeRushSettings>(() => {
    try {
      const saved = localStorage.getItem('dejavu_coderush_v5');
      return saved ? JSON.parse(saved) : INITIAL_CODERUSH_SETTINGS;
    } catch {
      return INITIAL_CODERUSH_SETTINGS;
    }
  });

  const [submissions, setSubmissions] = useState<CodeSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('dejavu_submissions_v5');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_coderush_v5', JSON.stringify(codeRushSettings));
    } catch {}
  }, [codeRushSettings]);

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_submissions_v5', JSON.stringify(submissions));
    } catch {}
  }, [submissions]);

  // Initial synchronization with backend server
  useEffect(() => {
    fetch('/api/code/round-state')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverState) => {
        if (serverState) {
          setCodeRushSettings((prev) => ({
            ...prev,
            status: serverState.status || prev.status,
            startTimestampMs: serverState.startTimestampMs ?? prev.startTimestampMs,
            durationMinutes: serverState.durationMinutes ?? prev.durationMinutes,
            scoringMode: serverState.scoringMode || prev.scoringMode,
          }));
        }
      })
      .catch(() => {});

    fetch('/api/code/submissions')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverSubs) => {
        if (Array.isArray(serverSubs) && serverSubs.length > 0) {
          setSubmissions(serverSubs);
        }
      })
      .catch(() => {});
  }, []);

  // 6. CodeBid (Round 3)
  const [codeBidSettings, setCodeBidSettings] = useState<CodeBidSettings>(() => {
    try {
      const saved = localStorage.getItem('dejavu_codebid_v4');
      return saved ? JSON.parse(saved) : INITIAL_CODEBID_SETTINGS;
    } catch {
      return INITIAL_CODEBID_SETTINGS;
    }
  });

  const [riddles, setRiddles] = useState<CodeBidRiddle[]>(() => {
    try {
      const saved = localStorage.getItem('dejavu_riddles_v4');
      return saved ? JSON.parse(saved) : MOCK_CODEBID_RIDDLES;
    } catch {
      return MOCK_CODEBID_RIDDLES;
    }
  });

  // 7. Leaderboard
  const [leaderboardSettings, setLeaderboardSettings] = useState<LeaderboardSettings>(() => {
    try {
      const saved = localStorage.getItem('dejavu_leaderboard_v4');
      return saved ? JSON.parse(saved) : INITIAL_LEADERBOARD_SETTINGS;
    } catch {
      return INITIAL_LEADERBOARD_SETTINGS;
    }
  });

  // 8. Contest Mode & Anti-Cheating Monitoring
  const [monitoringSettings, setMonitoringSettings] = useState<MonitoringViolationSettings>(() => {
    try {
      const saved = localStorage.getItem('dejavu_monitoring_settings_v5');
      return saved ? JSON.parse(saved) : DEFAULT_MONITORING_SETTINGS;
    } catch {
      return DEFAULT_MONITORING_SETTINGS;
    }
  });

  const [monitoringEvents, setMonitoringEvents] = useState<MonitoringEvent[]>(() => {
    try {
      const saved = localStorage.getItem('dejavu_monitoring_events_v5');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [teamMonitoringStatus, setTeamMonitoringStatus] = useState<Record<string, TeamMonitoringStatus>>(() => {
    try {
      const saved = localStorage.getItem('dejavu_team_monitoring_v5');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isContestModeActive, setIsContestModeActive] = useState<boolean>(false);
  const [activeContestRound, setActiveContestRound] = useState<'quiz' | 'coding' | 'bidding' | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_monitoring_settings_v5', JSON.stringify(monitoringSettings));
    } catch {}
  }, [monitoringSettings]);

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_monitoring_events_v5', JSON.stringify(monitoringEvents));
    } catch {}
  }, [monitoringEvents]);

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_team_monitoring_v5', JSON.stringify(teamMonitoringStatus));
    } catch {}
  }, [teamMonitoringStatus]);

  // Sync monitoring state with backend server
  useEffect(() => {
    fetch('/api/monitoring/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (settings) setMonitoringSettings(settings);
      })
      .catch(() => {});

    fetch('/api/monitoring/teams')
      .then((res) => (res.ok ? res.json() : null))
      .then((teamStatuses: TeamMonitoringStatus[]) => {
        if (Array.isArray(teamStatuses) && teamStatuses.length > 0) {
          const map: Record<string, TeamMonitoringStatus> = {};
          teamStatuses.forEach((st) => {
            map[st.teamId] = st;
          });
          setTeamMonitoringStatus(map);
        }
      })
      .catch(() => {});
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('dejavu_teams_v4', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('dejavu_current_team_v4', currentTeamId);
  }, [currentTeamId]);

  useEffect(() => {
    localStorage.setItem('dejavu_team_logged_in_v4', String(isTeamLoggedIn));
  }, [isTeamLoggedIn]);

  useEffect(() => {
    localStorage.setItem('dejavu_is_admin_v4', String(isAdmin));
  }, [isAdmin]);

  useEffect(() => {
    localStorage.setItem('dejavu_rounds_v4', JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    localStorage.setItem('dejavu_quiz_questions_v4', JSON.stringify(quizQuestions));
  }, [quizQuestions]);

  useEffect(() => {
    localStorage.setItem('dejavu_quiz_settings_v4', JSON.stringify(quizSettings));
  }, [quizSettings]);

  useEffect(() => {
    localStorage.setItem('dejavu_coderush_v4', JSON.stringify(codeRushSettings));
  }, [codeRushSettings]);

  useEffect(() => {
    localStorage.setItem('dejavu_codebid_v4', JSON.stringify(codeBidSettings));
  }, [codeBidSettings]);

  useEffect(() => {
    localStorage.setItem('dejavu_riddles_v4', JSON.stringify(riddles));
  }, [riddles]);

  useEffect(() => {
    localStorage.setItem('dejavu_leaderboard_v4', JSON.stringify(leaderboardSettings));
  }, [leaderboardSettings]);

  // Current logged in team
  const currentTeam = useMemo(() => {
    return teams.find((t) => t.id === currentTeamId) || teams[0];
  }, [teams, currentTeamId]);

  // Team Authentication
  // Searches strictly for assigned custom Team ID (e.g. CT2026), NOT team number
  const loginTeam = useCallback((teamId: string, passcode: string) => {
    const trimmedId = teamId.trim().toLowerCase();
    const trimmedPasscode = passcode.trim();
    const target = teams.find((t) => t.id.trim().toLowerCase() === trimmedId);
    if (!target) {
      return { success: false, message: 'Invalid Team ID. Please enter your assigned Team ID (e.g. CT2026).' };
    }
    if (target.passcode !== trimmedPasscode) {
      return { success: false, message: 'Incorrect password. Please verify your assigned credentials.' };
    }
    setCurrentTeamId(target.id);
    setIsTeamLoggedIn(true);
    return { success: true, message: `Welcome, ${target.name || target.id}!` };
  }, [teams]);

  const logoutTeam = useCallback(() => {
    setIsTeamLoggedIn(false);
  }, []);

  // Admin Authentication
  // Password verified securely via backend /api/admin/login endpoint
  const loginAdmin = useCallback(async (passcode: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      if (res.ok) {
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch {
      // In offline/test environments, verify against configured credential
      if (passcode.trim() === 'harshith2005') {
        setIsAdmin(true);
        return true;
      }
      return false;
    }
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
  }, []);

  // Team Admin Actions
  const updateTeam = useCallback((teamId: string, updates: Partial<Team>): { success: boolean; error?: string } => {
    if (updates.id && updates.id.trim().toUpperCase() !== teamId.trim().toUpperCase()) {
      const trimmedNewId = updates.id.trim().toUpperCase();
      const duplicate = teams.some((t) => t.id.trim().toUpperCase() === trimmedNewId && t.id !== teamId);
      if (duplicate) {
        return { success: false, error: `Team ID "${updates.id}" is already assigned to another team.` };
      }
    }

    if (updates.teamNumber !== undefined) {
      const duplicateNum = teams.some((t) => t.teamNumber === updates.teamNumber && t.id !== teamId);
      if (duplicateNum) {
        return { success: false, error: `Team Number "${updates.teamNumber}" is already in use.` };
      }
    }

    if (updates.passcode !== undefined && updates.passcode.trim().length === 0) {
      return { success: false, error: 'Password cannot be empty.' };
    }

    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          const updated = { ...t, ...updates };
          if (updates.id) updated.id = updates.id.trim();
          updated.totalScore = updated.quizScore + updated.codeScore + updated.bidScore;
          return updated;
        }
        return t;
      })
    );

    if (updates.id && currentTeamId === teamId) {
      setCurrentTeamId(updates.id.trim());
    }

    return { success: true };
  }, [teams, currentTeamId]);

  const registerTeamSlot = useCallback(
    (
      teamNumber: number,
      name: string,
      members: string[],
      passcode?: string,
      department?: string,
      customId?: string
    ): { success: boolean; error?: string } => {
      const targetId = customId?.trim() || `T${String(teamNumber).padStart(2, '0')}`;

      // Check duplicate ID
      const existingWithId = teams.find(
        (t) => t.id.trim().toUpperCase() === targetId.toUpperCase() && t.teamNumber !== teamNumber
      );
      if (existingWithId) {
        return { success: false, error: `Team ID "${targetId}" is already assigned to another team.` };
      }

      setTeams((prev) =>
        prev.map((t) => {
          if (t.teamNumber === teamNumber) {
            return {
              ...t,
              id: targetId,
              name: name.trim(),
              members: members.filter(Boolean),
              passcode: passcode?.trim() || t.passcode,
              department: department?.trim() || t.department,
              registrationStatus: 'Registered',
              status: 'Active',
              qualifiedRounds: Array.from(new Set([...t.qualifiedRounds, 'quiz'])),
            };
          }
          return t;
        })
      );
      return { success: true };
    },
    [teams]
  );

  const importTeamsFromCsv = useCallback((csvContent: string): { success: boolean; count: number; error?: string } => {
    try {
      const lines = csvContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        return { success: false, count: 0, error: 'CSV file is empty.' };
      }

      const startIndex = lines[0].toLowerCase().includes('team') ? 1 : 0;
      const dataLines = lines.slice(startIndex);

      if (dataLines.length === 0) {
        return { success: false, count: 0, error: 'No data rows found.' };
      }

      const imported: Partial<Team>[] = [];
      const seenIds = new Set<string>();

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const parts: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        parts.push(cur.trim());

        const teamNum = parseInt(parts[0], 10) || (i + 1);
        const teamName = parts[1] || `Team ${teamNum}`;
        const teamId = parts[2]?.trim() || `T${String(teamNum).padStart(2, '0')}`;
        const password = parts[3]?.trim() || `dv26-${teamId}`;
        const members = parts[4] ? parts[4].split(/[,;]/).map((m) => m.trim()).filter(Boolean) : [];
        const department = parts[5]?.trim() || '';

        if (seenIds.has(teamId.toUpperCase())) {
          return { success: false, count: 0, error: `Duplicate Team ID "${teamId}" on row ${i + 1}.` };
        }
        seenIds.add(teamId.toUpperCase());

        imported.push({
          teamNumber: teamNum,
          name: teamName,
          id: teamId,
          passcode: password,
          members,
          department,
          registrationStatus: 'Registered',
          status: 'Active',
          qualifiedRounds: ['quiz'],
        });
      }

      // Check duplicate ID with teams not included in import
      const importedTeamNums = new Set(imported.map((t) => t.teamNumber));
      for (const imp of imported) {
        const conflict = teams.find(
          (t) => !importedTeamNums.has(t.teamNumber) && t.id.toUpperCase() === imp.id!.toUpperCase()
        );
        if (conflict) {
          return { success: false, count: 0, error: `Team ID "${imp.id}" conflicts with Team #${conflict.teamNumber}.` };
        }
      }

      setTeams((prev) => {
        const next = [...prev];
        imported.forEach((imp) => {
          const idx = next.findIndex((t) => t.teamNumber === imp.teamNumber);
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...imp };
          }
        });
        return next;
      });

      return { success: true, count: imported.length };
    } catch (err: any) {
      return { success: false, count: 0, error: `CSV Import Error: ${err.message}` };
    }
  }, [teams]);

  const exportTeamsToCsv = useCallback((): string => {
    const headers = 'Team Number,Team Name,Team ID,Password,Members,Department';
    const rows = teams.map((t) => {
      const membersEscaped = `"${t.members.join(';')}"`;
      const nameEscaped = `"${t.name || `Team ${t.teamNumber}`}"`;
      return `${t.teamNumber},${nameEscaped},${t.id},${t.passcode},${membersEscaped},"${t.department || ''}"`;
    });
    return [headers, ...rows].join('\n');
  }, [teams]);

  const generateTeamCredentials = useCallback((teamNumber: number) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 3; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const teamId = `CT${teamNumber}${rand}`;
    const passcode = `DV@${Math.floor(1000 + Math.random() * 9000)}`;
    return { teamId, passcode };
  }, []);

  // Contest Mode & Monitoring Actions
  const updateMonitoringSettings = useCallback((settings: Partial<MonitoringViolationSettings>) => {
    setMonitoringSettings((prev) => {
      const updated = { ...prev, ...settings };
      fetch('/api/monitoring/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  }, []);

  const logMonitoringEvent = useCallback((eventData: Omit<MonitoringEvent, 'id' | 'timestamp'>) => {
    const now = Date.now();
    const event: MonitoringEvent = {
      ...eventData,
      id: `ev_${now}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
    };

    setMonitoringEvents((prev) => [event, ...prev.slice(0, 200)]);

    setTeamMonitoringStatus((prev) => {
      const current = prev[event.teamId] || {
        teamId: event.teamId,
        teamName: event.teamName,
        roundKey: event.roundKey,
        cameraStatus: 'CONNECTED',
        fullscreenStatus: 'ACTIVE',
        tabSwitchCount: 0,
        fullscreenExitCount: 0,
        warningCount: 0,
        lastActivityAt: now,
      };

      const updated: TeamMonitoringStatus = { ...current, roundKey: event.roundKey, lastActivityAt: now };

      if (event.type === 'CAMERA_CONNECTED') updated.cameraStatus = 'CONNECTED';
      if (event.type === 'CAMERA_INTERRUPTED') updated.cameraStatus = 'INTERRUPTED';
      if (event.type === 'FULLSCREEN_ENTER') updated.fullscreenStatus = 'ACTIVE';
      if (event.type === 'FULLSCREEN_EXIT') {
        updated.fullscreenStatus = 'EXITED';
        updated.fullscreenExitCount += 1;
        updated.warningCount += 1;
      }
      if (event.type === 'TAB_SWITCH') {
        updated.tabSwitchCount += 1;
        updated.warningCount += 1;
      }

      return { ...prev, [event.teamId]: updated };
    });

    fetch('/api/monitoring/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    }).catch(() => {});
  }, []);

  const updateTeamMonitoringState = useCallback((teamId: string, updates: Partial<TeamMonitoringStatus>) => {
    setTeamMonitoringStatus((prev) => {
      const existing = prev[teamId] || {
        teamId,
        teamName: teamId,
        cameraStatus: 'CONNECTED',
        fullscreenStatus: 'ACTIVE',
        tabSwitchCount: 0,
        fullscreenExitCount: 0,
        warningCount: 0,
        lastActivityAt: Date.now(),
      };
      return { ...prev, [teamId]: { ...existing, ...updates } };
    });
  }, []);

  const enterContestMode = useCallback((round: 'quiz' | 'coding' | 'bidding') => {
    setIsContestModeActive(true);
    setActiveContestRound(round);
  }, []);

  const exitContestMode = useCallback(() => {
    setIsContestModeActive(false);
    setActiveContestRound(null);
  }, []);

  const deleteTeamSlot = useCallback((teamId: string) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            name: '',
            members: [],
            registrationStatus: 'Not Registered',
            status: 'Active',
            qualifiedRounds: [],
            quizScore: 0,
            codeScore: 0,
            bidScore: 0,
            totalScore: 0,
            coins: 100,
          };
        }
        return t;
      })
    );
    // clear quiz session for this team
    try {
      localStorage.removeItem(`dejavu_quiz_session_${teamId}`);
    } catch {}
  }, []);

  const toggleTeamStatus = useCallback((teamId: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, status: t.status === 'Active' ? 'Eliminated' : 'Active' } : t))
    );
  }, []);

  const changeTeamPassword = useCallback((teamId: string, newPasscode: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, passcode: newPasscode.trim() } : t))
    );
  }, []);

  const overrideQualification = useCallback((
    teamId: string,
    roundKey: 'quiz' | 'coding' | 'bidding',
    qualify: boolean
  ) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          const nextRounds = qualify
            ? Array.from(new Set([...t.qualifiedRounds, roundKey]))
            : t.qualifiedRounds.filter((r) => r !== roundKey);
          return { ...t, qualifiedRounds: nextRounds };
        }
        return t;
      })
    );

    if (roundKey === 'coding') {
      setCodeRushSettings((prev) => ({
        ...prev,
        qualifiedTeamIds: qualify
          ? Array.from(new Set([...prev.qualifiedTeamIds, teamId]))
          : prev.qualifiedTeamIds.filter((id) => id !== teamId),
      }));
    } else if (roundKey === 'bidding') {
      setCodeBidSettings((prev) => ({
        ...prev,
        qualifiedTeamIds: qualify
          ? Array.from(new Set([...prev.qualifiedTeamIds, teamId]))
          : prev.qualifiedTeamIds.filter((id) => id !== teamId),
      }));
    }
  }, []);

  // Round Management
  const setRoundStatus = useCallback((roundKey: 'quiz' | 'coding' | 'bidding', status: RoundStatus) => {
    setRounds((prev) => prev.map((r) => (r.key === roundKey ? { ...r, status } : r)));
    if (roundKey === 'quiz') {
      setQuizSettings((prev) => ({ ...prev, status }));
    } else if (roundKey === 'coding') {
      setCodeRushSettings((prev) => ({ ...prev, status }));
    } else if (roundKey === 'bidding') {
      setCodeBidSettings((prev) => ({ ...prev, status }));
    }
  }, []);

  const updateRoundRules = useCallback((roundKey: 'quiz' | 'coding' | 'bidding', rules: string[]) => {
    setRounds((prev) => prev.map((r) => (r.key === roundKey ? { ...r, rules } : r)));
  }, []);

  // Determine specific state for a team in a given round:
  // 'LOCKED' | 'READY' | 'ACTIVE' | 'COMPLETED' | 'ELIMINATED'
  const getTeamRoundStatus = useCallback((roundKey: 'quiz' | 'coding' | 'bidding', teamId?: string): RoundStatus => {
    const targetTeamId = teamId || currentTeamId;
    const team = teams.find((t) => t.id === targetTeamId) || currentTeam;
    
    if (team.status === 'Eliminated') {
      return 'ELIMINATED';
    }

    const round = rounds.find((r) => r.key === roundKey);
    const globalStatus = round?.status || 'LOCKED';

    if (roundKey === 'quiz') {
      // Check persistent quiz session
      try {
        const savedSession = localStorage.getItem(`dejavu_quiz_session_${targetTeamId}`);
        if (savedSession) {
          const session: TeamQuizSession = JSON.parse(savedSession);
          if (session.isFinished) {
            return 'COMPLETED';
          }
          if (session.startedAt) {
            return 'ACTIVE';
          }
        }
      } catch {}

      if (globalStatus === 'LOCKED') return 'LOCKED';
      if (globalStatus === 'COMPLETED') return 'COMPLETED';
      return 'READY';
    }

    if (roundKey === 'coding') {
      if (!codeRushSettings.qualifiedTeamIds.includes(targetTeamId)) {
        return 'LOCKED';
      }
      if (globalStatus === 'LOCKED') return 'LOCKED';
      if (globalStatus === 'COMPLETED') return 'COMPLETED';
      return globalStatus === 'ACTIVE' ? 'ACTIVE' : 'READY';
    }

    if (roundKey === 'bidding') {
      if (!codeBidSettings.qualifiedTeamIds.includes(targetTeamId)) {
        return 'LOCKED';
      }
      if (globalStatus === 'LOCKED') return 'LOCKED';
      if (globalStatus === 'COMPLETED') return 'COMPLETED';
      return globalStatus === 'ACTIVE' ? 'ACTIVE' : 'READY';
    }

    return 'LOCKED';
  }, [teams, currentTeamId, currentTeam, rounds, codeRushSettings.qualifiedTeamIds, codeBidSettings.qualifiedTeamIds]);

  const isRoundLockedForTeam = useCallback((roundKey: 'quiz' | 'coding' | 'bidding'): boolean => {
    const status = getTeamRoundStatus(roundKey, currentTeamId);
    return status === 'LOCKED' || status === 'ELIMINATED';
  }, [getTeamRoundStatus, currentTeamId]);

  // Round 1 (Quiz) Settings & Questions
  const updateQuizSettings = useCallback((settings: Partial<QuizSettings>) => {
    setQuizSettings((prev) => ({ ...prev, ...settings }));
  }, []);

  const addQuizQuestion = useCallback((q: Omit<QuizQuestion, 'id'>) => {
    setQuizQuestions((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((item) => item.id)) + 1 : 1;
      return [...prev, { ...q, id: nextId }];
    });
  }, []);

  const editQuizQuestion = useCallback((id: number, q: Partial<QuizQuestion>) => {
    setQuizQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, ...q } : item)));
  }, []);

  const deleteQuizQuestion = useCallback((id: number) => {
    setQuizQuestions((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // -------------------------------------------------------------
  // Persistent, Anti-Reset Quiz Session (Authoritative Timing)
  // -------------------------------------------------------------
  const getQuizSession = useCallback((teamId?: string): TeamQuizSession => {
    const targetTeamId = teamId || currentTeamId;
    try {
      const saved = localStorage.getItem(`dejavu_quiz_session_${targetTeamId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}

    // If not existing, build a fresh session template (not yet started)
    return {
      teamId: targetTeamId,
      startedAt: 0,
      currentQuestionIndex: 0,
      questionStartedAt: 0,
      questions: [],
      answers: {},
      completedQuestionIndices: [],
      isFinished: false,
    };
  }, [currentTeamId]);

  // Start or resume quiz session
  const startQuizSession = useCallback((teamId?: string): TeamQuizSession => {
    const targetTeamId = teamId || currentTeamId;
    const existing = getQuizSession(targetTeamId);
    if (existing.startedAt > 0 && existing.questions.length > 0) {
      return existing; // already initialized, return existing
    }

    // Build randomized questions sequence
    let pool = [...quizQuestions];
    if (quizSettings.shuffleQuestions) {
      const seed = hashString(targetTeamId);
      pool = [...pool].sort((a, b) => {
        const hashA = (a.id * 9301 + 49297 + seed) % 233280;
        const hashB = (b.id * 9301 + 49297 + seed) % 233280;
        return hashA - hashB;
      });
    }

    const selectedPool = pool.slice(0, quizSettings.totalQuestions);

    const participantQuestions: ParticipantQuizQuestion[] = selectedPool.map((q, qIndex) => {
      let optionIndices = [0, 1, 2, 3];
      if (quizSettings.shuffleOptions) {
        const optionSeed = hashString(`${targetTeamId}_q_${q.id}_${qIndex}`);
        optionIndices = [...optionIndices].sort((x, y) => {
          const hX = (x * 37 + optionSeed) % 101;
          const hY = (y * 37 + optionSeed) % 101;
          return hX - hY;
        });
      }

      return {
        id: q.id,
        question: q.question,
        options: optionIndices.map((i) => q.options[i]),
        points: q.points,
        optionOriginalIndices: optionIndices,
      };
    });

    const now = Date.now();
    const newSession: TeamQuizSession = {
      teamId: targetTeamId,
      startedAt: now,
      currentQuestionIndex: 0,
      questionStartedAt: now,
      questions: participantQuestions,
      answers: {},
      completedQuestionIndices: [],
      isFinished: false,
    };

    localStorage.setItem(`dejavu_quiz_session_${targetTeamId}`, JSON.stringify(newSession));
    return newSession;
  }, [currentTeamId, getQuizSession, quizQuestions, quizSettings]);

  // Save selected answer for current question
  const recordQuizAnswer = useCallback((questionId: number, chosenOptionIndex: number) => {
    const session = getQuizSession(currentTeamId);
    if (session.isFinished) return;
    session.answers[questionId] = chosenOptionIndex;
    localStorage.setItem(`dejavu_quiz_session_${currentTeamId}`, JSON.stringify(session));
  }, [getQuizSession, currentTeamId]);

  // Finish quiz and calculate authoritative score
  const finishQuizSession = useCallback((): { score: number; total: number } => {
    const session = getQuizSession(currentTeamId);
    let calculatedScore = 0;

    session.questions.forEach((pq) => {
      const chosenOptionIdx = session.answers[pq.id];
      if (chosenOptionIdx !== undefined && pq.optionOriginalIndices) {
        const originalIndex = pq.optionOriginalIndices[chosenOptionIdx];
        const originalQuestion = quizQuestions.find((q) => q.id === pq.id);
        if (originalQuestion && originalIndex === originalQuestion.correctIndex) {
          calculatedScore += pq.points || 2;
        }
      }
    });

    session.isFinished = true;
    session.finishedAt = Date.now();
    session.score = calculatedScore;
    localStorage.setItem(`dejavu_quiz_session_${currentTeamId}`, JSON.stringify(session));

    // Update team state
    updateTeam(currentTeamId, {
      quizScore: calculatedScore,
      qualifiedRounds: Array.from(new Set([...currentTeam.qualifiedRounds, 'quiz'])),
    });

    return {
      score: calculatedScore,
      total: quizSettings.totalQuestions * quizSettings.pointsPerQuestion,
    };
  }, [getQuizSession, currentTeamId, quizQuestions, updateTeam, currentTeam.qualifiedRounds, quizSettings]);

  // Advance question (called manually or when 30s timer hits zero)
  const advanceQuizQuestion = useCallback((chosenOptionIndex?: number): TeamQuizSession => {
    const session = getQuizSession(currentTeamId);
    if (session.isFinished) return session;

    const currentQ = session.questions[session.currentQuestionIndex];
    if (currentQ && chosenOptionIndex !== undefined) {
      session.answers[currentQ.id] = chosenOptionIndex;
    }

    if (!session.completedQuestionIndices.includes(session.currentQuestionIndex)) {
      session.completedQuestionIndices.push(session.currentQuestionIndex);
    }

    const nextIndex = session.currentQuestionIndex + 1;
    if (nextIndex < session.questions.length) {
      session.currentQuestionIndex = nextIndex;
      session.questionStartedAt = Date.now(); // reset question timer for NEXT question
      localStorage.setItem(`dejavu_quiz_session_${currentTeamId}`, JSON.stringify(session));
      return session;
    } else {
      // Reached end of questions
      finishQuizSession();
      return getQuizSession(currentTeamId);
    }
  }, [getQuizSession, currentTeamId, finishQuizSession]);

  const resetQuizSession = useCallback((teamId?: string) => {
    const targetTeamId = teamId || currentTeamId;
    localStorage.removeItem(`dejavu_quiz_session_${targetTeamId}`);
    updateTeam(targetTeamId, { quizScore: 0 });
  }, [currentTeamId, updateTeam]);

  // -------------------------------------------------------------
  // Round 2 (CodeRush)
  // -------------------------------------------------------------
  const updateCodeRushSettings = useCallback((settings: Partial<CodeRushSettings>) => {
    setCodeRushSettings((prev) => {
      const updated = { ...prev, ...settings };
      fetch('/api/code/admin/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  }, []);

  const addCodingProblem = useCallback((problem: CodingProblem) => {
    setCodeRushSettings((prev) => {
      const exists = prev.problems.some((p) => p.id === problem.id);
      const updatedProblems = exists
        ? prev.problems.map((p) => (p.id === problem.id ? problem : p))
        : [...prev.problems, problem];

      fetch('/api/code/admin/problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problem),
      }).catch(() => {});

      return { ...prev, problems: updatedProblems };
    });
  }, []);

  const editCodingProblem = useCallback((problemId: string, updates: Partial<CodingProblem>) => {
    setCodeRushSettings((prev) => {
      const updatedProblems = prev.problems.map((p) => {
        if (p.id === problemId) {
          const merged = { ...p, ...updates };
          fetch('/api/code/admin/problem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged),
          }).catch(() => {});
          return merged;
        }
        return p;
      });
      return { ...prev, problems: updatedProblems };
    });
  }, []);

  const deleteCodingProblem = useCallback((problemId: string) => {
    setCodeRushSettings((prev) => {
      const updatedProblems = prev.problems.filter((p) => p.id !== problemId);
      fetch(`/api/code/admin/problem/${problemId}`, { method: 'DELETE' }).catch(() => {});
      return { ...prev, problems: updatedProblems };
    });
  }, []);

  const startRound2Timer = useCallback((durationMinutes?: number) => {
    const startMs = Date.now();
    const dur = durationMinutes !== undefined ? durationMinutes : codeRushSettings.durationMinutes;
    setCodeRushSettings((prev) => {
      const updated: CodeRushSettings = {
        ...prev,
        status: 'ACTIVE' as RoundStatus,
        startTimestampMs: startMs,
        durationMinutes: dur,
      };
      fetch('/api/code/admin/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
    setRounds((prev) => prev.map((r) => (r.key === 'coding' ? { ...r, status: 'ACTIVE' } : r)));
  }, [codeRushSettings.durationMinutes]);

  const pauseRound2Timer = useCallback(() => {
    setCodeRushSettings((prev) => {
      const updated: CodeRushSettings = { ...prev, status: 'READY' as RoundStatus };
      fetch('/api/code/admin/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
    setRounds((prev) => prev.map((r) => (r.key === 'coding' ? { ...r, status: 'READY' } : r)));
  }, []);

  const resetRound2Timer = useCallback(() => {
    setCodeRushSettings((prev) => {
      const updated: CodeRushSettings = { ...prev, status: 'READY' as RoundStatus, startTimestampMs: 0 };
      fetch('/api/code/admin/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
    setRounds((prev) => prev.map((r) => (r.key === 'coding' ? { ...r, status: 'READY' } : r)));
  }, []);

  const setRound2ScoringMode = useCallback((mode: 'partial' | 'all_or_nothing') => {
    setCodeRushSettings((prev) => {
      const updated: CodeRushSettings = { ...prev, scoringMode: mode };
      fetch('/api/code/admin/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoringMode: mode }),
      }).catch(() => {});
      return updated;
    });
  }, []);

  const getTeamCodeScore = useCallback((teamId?: string): number => {
    const targetId = teamId || currentTeamId;
    const teamSubs = submissions.filter((s) => s.teamId.toLowerCase() === targetId.toLowerCase());
    const bestPerProblem: Record<string, number> = {};
    for (const sub of teamSubs) {
      if (!bestPerProblem[sub.problemId] || sub.score > bestPerProblem[sub.problemId]) {
        bestPerProblem[sub.problemId] = sub.score;
      }
    }
    return Object.values(bestPerProblem).reduce((sum, score) => sum + score, 0);
  }, [currentTeamId, submissions]);

  const addSubmissionRecord = useCallback((submission: CodeSubmission) => {
    setSubmissions((prev) => [submission, ...prev]);

    const targetTeamId = submission.teamId;
    setTeams((prevTeams) =>
      prevTeams.map((t) => {
        if (t.id.toLowerCase() === targetTeamId.toLowerCase()) {
          const allSubs = [submission, ...submissions.filter((s) => s.teamId.toLowerCase() === targetTeamId.toLowerCase())];
          const bestPerProblem: Record<string, number> = {};
          for (const s of allSubs) {
            if (!bestPerProblem[s.problemId] || s.score > bestPerProblem[s.problemId]) {
              bestPerProblem[s.problemId] = s.score;
            }
          }
          const totalCodeScore = Object.values(bestPerProblem).reduce((a, b) => a + b, 0);
          return {
            ...t,
            codeScore: totalCodeScore,
            totalScore: t.quizScore + totalCodeScore + t.bidScore,
          };
        }
        return t;
      })
    );
  }, [submissions]);

  const computeRound2Elimination = useCallback(() => {
    const registeredTeams = teams.filter((t) => t.registrationStatus === 'Registered' || t.name.trim().length > 0);
    const sorted = [...registeredTeams].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.quizScore !== a.quizScore) return b.quizScore - a.quizScore;
      return a.teamNumber - b.teamNumber;
    });

    const top5 = sorted.slice(0, 5);
    const top5Ids = top5.map((t) => t.id);
    const eliminated = sorted.slice(5);

    // Update teams statuses
    setTeams((prev) =>
      prev.map((t) => {
        if (top5Ids.includes(t.id)) {
          return {
            ...t,
            status: 'Active',
            qualifiedRounds: Array.from(new Set([...t.qualifiedRounds, 'bidding'])),
          };
        } else if (eliminated.some((e) => e.id === t.id)) {
          return {
            ...t,
            status: 'Eliminated',
            qualifiedRounds: t.qualifiedRounds.filter((r) => r !== 'bidding'),
          };
        }
        return t;
      })
    );

    // Qualify Top 5 for CodeBid
    setCodeBidSettings((prev) => ({
      ...prev,
      qualifiedTeamIds: top5Ids,
    }));

    return { top5, eliminated };
  }, [teams]);

  // -------------------------------------------------------------
  // Round 3 (CodeBid)
  // -------------------------------------------------------------
  const updateCodeBidSettings = useCallback((settings: Partial<CodeBidSettings>) => {
    setCodeBidSettings((prev) => ({ ...prev, ...settings }));
  }, []);

  const currentRiddle = useMemo(() => {
    if (codeBidSettings.isTieBreaker && codeBidSettings.tieBreakerRiddle) {
      return codeBidSettings.tieBreakerRiddle;
    }
    return riddles[codeBidSettings.currentRiddleIndex] || riddles[0];
  }, [codeBidSettings.isTieBreaker, codeBidSettings.tieBreakerRiddle, codeBidSettings.currentRiddleIndex, riddles]);

  const placeBid = useCallback((amount: number) => {
    if (codeBidSettings.auctionState !== 'bidding') {
      return { success: false, message: 'Bidding is currently not open.' };
    }
    if (amount <= currentRiddle.currentBid) {
      return {
        success: false,
        message: `Bid must exceed current highest bid (${currentRiddle.currentBid} coins).`,
      };
    }
    if (amount < currentRiddle.currentBid + codeBidSettings.bidIncrement) {
      return {
        success: false,
        message: `Minimum increment is +${codeBidSettings.bidIncrement} coins.`,
      };
    }
    if (currentTeam.coins < amount) {
      return { success: false, message: `Insufficient coins (Balance: ${currentTeam.coins}).` };
    }

    const newRecord = {
      id: `bid-${Date.now()}`,
      bidderTeamId: currentTeam.id,
      bidderTeamName: currentTeam.name || `Team ${currentTeam.teamNumber}`,
      amount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setRiddles((prev) =>
      prev.map((r, idx) => {
        if (idx === codeBidSettings.currentRiddleIndex) {
          return {
            ...r,
            currentBid: amount,
            highestBidderTeamId: currentTeam.id,
            highestBidderTeamName: currentTeam.name || `Team ${currentTeam.teamNumber}`,
            bidsHistory: [newRecord, ...r.bidsHistory],
          };
        }
        return r;
      })
    );

    return { success: true, message: `Bid of ${amount} coins placed successfully!` };
  }, [codeBidSettings.auctionState, codeBidSettings.bidIncrement, codeBidSettings.currentRiddleIndex, currentRiddle.currentBid, currentTeam]);

  const startAuction = useCallback(() => {
    setCodeBidSettings((prev) => ({ ...prev, auctionState: 'bidding' }));
    setRiddles((prev) =>
      prev.map((r, idx) => (idx === codeBidSettings.currentRiddleIndex ? { ...r, status: 'bidding' } : r))
    );
  }, [codeBidSettings.currentRiddleIndex]);

  const pauseAuction = useCallback(() => {
    setCodeBidSettings((prev) => ({ ...prev, auctionState: 'paused' }));
  }, []);

  const closeAuction = useCallback(() => {
    setCodeBidSettings((prev) => ({ ...prev, auctionState: 'closed' }));
  }, []);

  const revealHighestBidder = useCallback(() => {
    if (!currentRiddle.highestBidderTeamId) return;
    setCodeBidSettings((prev) => ({ ...prev, auctionState: 'solving' }));
    setRiddles((prev) =>
      prev.map((r, idx) => {
        if (idx === codeBidSettings.currentRiddleIndex) {
          return {
            ...r,
            status: 'solving',
            currentSolvingTeamId: r.highestBidderTeamId,
            attemptedTeamIds: [r.highestBidderTeamId!],
          };
        }
        return r;
      })
    );
  }, [currentRiddle.highestBidderTeamId, codeBidSettings.currentRiddleIndex]);

  const markSolvingResult = useCallback((isCorrect: boolean) => {
    const riddle = currentRiddle;
    if (!riddle.currentSolvingTeamId) return;

    if (isCorrect) {
      // Award DOUBLE the bid as points
      const awardedPoints = riddle.currentBid * 2;
      const winnerId = riddle.currentSolvingTeamId;

      setTeams((prev) =>
        prev.map((t) => {
          if (t.id === winnerId) {
            const newBidScore = t.bidScore + awardedPoints;
            const newCoins = Math.max(0, t.coins - riddle.currentBid);
            return {
              ...t,
              bidScore: newBidScore,
              coins: newCoins,
              totalScore: t.quizScore + t.codeScore + newBidScore,
            };
          }
          return t;
        })
      );

      setRiddles((prev) =>
        prev.map((r, idx) =>
          idx === codeBidSettings.currentRiddleIndex
            ? { ...r, status: 'solved', winnerTeamId: winnerId, awardedPoints }
            : r
        )
      );

      setCodeBidSettings((prev) => ({ ...prev, auctionState: 'closed' }));
    } else {
      // Incorrect -> Pass to next highest bidder
      const attempts = [...riddle.attemptedTeamIds, riddle.currentSolvingTeamId];
      const remainingBids = riddle.bidsHistory.filter((b) => !attempts.includes(b.bidderTeamId));

      if (remainingBids.length > 0) {
        const nextBid = remainingBids[0];
        setRiddles((prev) =>
          prev.map((r, idx) =>
            idx === codeBidSettings.currentRiddleIndex
              ? {
                  ...r,
                  currentSolvingTeamId: nextBid.bidderTeamId,
                  attemptedTeamIds: attempts,
                  highestBidderTeamId: nextBid.bidderTeamId,
                  highestBidderTeamName: nextBid.bidderTeamName,
                  currentBid: nextBid.amount,
                }
              : r
          )
        );
      } else {
        setRiddles((prev) =>
          prev.map((r, idx) =>
            idx === codeBidSettings.currentRiddleIndex
              ? { ...r, status: 'passed', currentSolvingTeamId: null }
              : r
          )
        );
        setCodeBidSettings((prev) => ({ ...prev, auctionState: 'closed' }));
      }
    }
  }, [currentRiddle, codeBidSettings.currentRiddleIndex]);

  const passToNextBidder = useCallback(() => {
    markSolvingResult(false);
  }, [markSolvingResult]);

  const nextRiddle = useCallback(() => {
    if (codeBidSettings.currentRiddleIndex < riddles.length - 1) {
      setCodeBidSettings((prev) => ({
        ...prev,
        currentRiddleIndex: prev.currentRiddleIndex + 1,
        auctionState: 'idle',
      }));
    }
  }, [codeBidSettings.currentRiddleIndex, riddles.length]);

  const startTieBreaker = useCallback((customRiddleText?: string, customAnswer?: string) => {
    const tieRiddle: CodeBidRiddle = {
      ...TIE_BREAKER_RIDDLE,
      riddleText: customRiddleText || TIE_BREAKER_RIDDLE.riddleText,
      solutionAnswer: customAnswer || TIE_BREAKER_RIDDLE.solutionAnswer,
    };

    setCodeBidSettings((prev) => ({
      ...prev,
      isTieBreaker: true,
      tieBreakerRiddle: tieRiddle,
      auctionState: 'bidding',
    }));
  }, []);

  const editRiddle = useCallback((id: string, updates: Partial<CodeBidRiddle>) => {
    setRiddles((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  // Leaderboard
  const updateLeaderboardSettings = useCallback((settings: Partial<LeaderboardSettings>) => {
    setLeaderboardSettings((prev) => ({ ...prev, ...settings }));
  }, []);

  // Global reset
  const resetCompetitionData = useCallback(() => {
    localStorage.clear();
    setTeams(INITIAL_TEAMS);
    setRounds(INITIAL_ROUNDS);
    setQuizSettings(INITIAL_QUIZ_SETTINGS);
    setQuizQuestions(MOCK_QUIZ_QUESTIONS);
    setCodeRushSettings(INITIAL_CODERUSH_SETTINGS);
    setCodeBidSettings(INITIAL_CODEBID_SETTINGS);
    setRiddles(MOCK_CODEBID_RIDDLES);
    setLeaderboardSettings(INITIAL_LEADERBOARD_SETTINGS);
    setCurrentTeamId('T01');
    setIsAdmin(false);
  }, []);

  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    teams,
    currentTeam,
    currentTeamId,
    isTeamLoggedIn,
    isAdmin,
    loginTeam,
    logoutTeam,
    loginAdmin,
    logoutAdmin,
    updateTeam,
    registerTeamSlot,
    deleteTeamSlot,
    toggleTeamStatus,
    changeTeamPassword,
    overrideQualification,
    importTeamsFromCsv,
    exportTeamsToCsv,
    generateTeamCredentials,
    monitoringSettings,
    updateMonitoringSettings,
    monitoringEvents,
    teamMonitoringStatus,
    logMonitoringEvent,
    updateTeamMonitoringState,
    isContestModeActive,
    activeContestRound,
    enterContestMode,
    exitContestMode,
    rounds,
    setRoundStatus,
    updateRoundRules,
    getTeamRoundStatus,
    isRoundLockedForTeam,
    quizQuestions,
    quizSettings,
    updateQuizSettings,
    addQuizQuestion,
    editQuizQuestion,
    deleteQuizQuestion,
    getQuizSession,
    startQuizSession,
    recordQuizAnswer,
    advanceQuizQuestion,
    finishQuizSession,
    resetQuizSession,
    codeRushSettings,
    updateCodeRushSettings,
    addCodingProblem,
    editCodingProblem,
    deleteCodingProblem,
    submissions,
    addSubmissionRecord,
    startRound2Timer,
    pauseRound2Timer,
    resetRound2Timer,
    setRound2ScoringMode,
    getTeamCodeScore,
    computeRound2Elimination,
    codeBidSettings,
    updateCodeBidSettings,
    riddles,
    currentRiddle,
    placeBid,
    startAuction,
    pauseAuction,
    closeAuction,
    revealHighestBidder,
    markSolvingResult,
    passToNextBidder,
    nextRiddle,
    startTieBreaker,
    editRiddle,
    leaderboardSettings,
    updateLeaderboardSettings,
    resetCompetitionData,
  }), [
    theme,
    toggleTheme,
    teams,
    currentTeam,
    currentTeamId,
    isTeamLoggedIn,
    isAdmin,
    loginTeam,
    logoutTeam,
    loginAdmin,
    logoutAdmin,
    updateTeam,
    registerTeamSlot,
    deleteTeamSlot,
    toggleTeamStatus,
    changeTeamPassword,
    overrideQualification,
    importTeamsFromCsv,
    exportTeamsToCsv,
    generateTeamCredentials,
    monitoringSettings,
    updateMonitoringSettings,
    monitoringEvents,
    teamMonitoringStatus,
    logMonitoringEvent,
    updateTeamMonitoringState,
    isContestModeActive,
    activeContestRound,
    enterContestMode,
    exitContestMode,
    rounds,
    setRoundStatus,
    updateRoundRules,
    getTeamRoundStatus,
    isRoundLockedForTeam,
    quizQuestions,
    quizSettings,
    updateQuizSettings,
    addQuizQuestion,
    editQuizQuestion,
    deleteQuizQuestion,
    getQuizSession,
    startQuizSession,
    recordQuizAnswer,
    advanceQuizQuestion,
    finishQuizSession,
    resetQuizSession,
    codeRushSettings,
    updateCodeRushSettings,
    addCodingProblem,
    editCodingProblem,
    deleteCodingProblem,
    submissions,
    addSubmissionRecord,
    startRound2Timer,
    pauseRound2Timer,
    resetRound2Timer,
    setRound2ScoringMode,
    getTeamCodeScore,
    computeRound2Elimination,
    codeBidSettings,
    updateCodeBidSettings,
    riddles,
    currentRiddle,
    placeBid,
    startAuction,
    pauseAuction,
    closeAuction,
    revealHighestBidder,
    markSolvingResult,
    passToNextBidder,
    nextRiddle,
    startTieBreaker,
    editRiddle,
    leaderboardSettings,
    updateLeaderboardSettings,
    resetCompetitionData,
  ]);

  return (
    <CompetitionContext.Provider value={contextValue}>
      {children}
    </CompetitionContext.Provider>
  );
};

export const useCompetition = () => {
  const context = useContext(CompetitionContext);
  if (!context) {
    throw new Error('useCompetition must be used within a CompetitionProvider');
  }
  return context;
};
