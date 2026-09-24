export type RoundStatus = 'LOCKED' | 'READY' | 'ACTIVE' | 'COMPLETED' | 'ELIMINATED';
export type RegistrationStatus = 'Registered' | 'Not Registered';
export type TeamStatus = 'Active' | 'Eliminated';
export type Theme = 'light' | 'dark';

export interface Team {
  id: string; // Custom Team ID / Username chosen by admin e.g. CT2026, BH26
  teamNumber: number; // 1 to 25
  name: string;
  members: string[];
  passcode: string;
  department?: string; // Optional department / branch
  status: TeamStatus;
  registrationStatus: RegistrationStatus;
  qualifiedRounds: ('quiz' | 'coding' | 'bidding')[];
  rank: number;
  quizScore: number;
  codeScore: number;
  bidScore: number;
  totalScore: number;
  coins: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[]; // exactly 4 options
  correctIndex: number; // 0, 1, 2, 3
  points: number; // 2 points
}

export interface ParticipantQuizQuestion {
  id: number;
  question: string;
  options: string[];
  points: number;
  // Internal mapping of randomized option index back to original index for secure scoring
  optionOriginalIndices?: number[];
}

export interface TeamQuizSession {
  teamId: string;
  startedAt: number; // timestamp ms
  currentQuestionIndex: number; // 0 to 24
  questionStartedAt: number; // timestamp ms when current question started
  questions: ParticipantQuizQuestion[];
  answers: Record<number, number>; // questionId -> chosen option index
  completedQuestionIndices: number[];
  isFinished: boolean;
  finishedAt?: number;
  score?: number;
}

export interface QuizSettings {
  title: string;
  totalQuestions: number; // 25
  pointsPerQuestion: number; // 2
  timePerQuestionSeconds: number; // 30
  durationMinutes: number; // 12.5
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: RoundStatus;
  eligibleTeamIds: string[];
}

export type SupportedLanguage = 'python' | 'c' | 'cpp' | 'java' | 'r';

export interface ExampleTestCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface HiddenTestCase {
  id: string;
  input: string;
  expectedOutput: string;
}

export interface ProblemStarterCodes {
  python: string;
  c: string;
  cpp: string;
  java: string;
  r: string;
}

export interface CodingProblem {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  timeLimit: string;
  timeLimitSeconds: number;
  memoryLimit: string;
  memoryLimitMb: number;
  examples: ExampleTestCase[];
  starterCode: ProblemStarterCodes;
  hiddenTestCases?: HiddenTestCase[];
  judgeUrl?: string;
}

export interface TestCaseResult {
  testCaseIndex: number;
  status: 'Passed' | 'Failed' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
  executionTime?: string;
  memory?: string;
}

export interface CodeSubmission {
  id: string;
  teamId: string;
  teamName: string;
  problemId: string;
  problemName: string;
  language: SupportedLanguage;
  sourceCode: string;
  submittedAt: number;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Compilation Error' | 'Runtime Error';
  score: number;
  maxScore: number;
  passedCount: number;
  totalCount: number;
  testResults: TestCaseResult[];
  executionTime?: string;
}

export interface CodeRushSettings {
  externalContestUrl: string;
  durationMinutes: number;
  startTime: string;
  startTimestampMs: number;
  status: RoundStatus;
  scoringMode: 'partial' | 'all_or_nothing';
  qualifiedTeamIds: string[];
  problems: CodingProblem[];
}

export interface BidRecord {
  id: string;
  bidderTeamId: string;
  bidderTeamName: string;
  amount: number;
  timestamp: string;
}

export interface CodeBidRiddle {
  id: string;
  riddleNumber: number;
  title: string;
  riddleText: string;
  bountyPoints: number;
  startingBid: number;
  currentBid: number;
  highestBidderTeamId: string | null;
  highestBidderTeamName: string | null;
  maxSolvingTimeSeconds: number;
  solutionAnswer: string;
  bidsHistory: BidRecord[];
  status: 'pending' | 'bidding' | 'solving' | 'solved' | 'passed';
  currentSolvingTeamId: string | null;
  attemptedTeamIds: string[];
  winnerTeamId?: string | null;
  awardedPoints?: number;
}

export interface CodeBidSettings {
  status: RoundStatus;
  auctionState: 'idle' | 'bidding' | 'paused' | 'solving' | 'closed';
  currentRiddleIndex: number;
  bidIncrement: number;
  startingCoins: number;
  isTieBreaker: boolean;
  tieBreakerRiddle?: CodeBidRiddle;
  qualifiedTeamIds: string[];
}

export interface RoundInfo {
  id: number;
  key: 'quiz' | 'coding' | 'bidding';
  name: string;
  roundNumber: number;
  status: RoundStatus;
  startTime: string;
  duration: string;
  rules: string[];
}

export interface LeaderboardSettings {
  isVisibleToParticipants: boolean;
  isFrozen: boolean;
}

// -------------------------------------------------------------
// Contest Mode & Monitoring Interfaces
// -------------------------------------------------------------
export type MonitoringEventType =
  | 'CAMERA_CONNECTED'
  | 'CAMERA_INTERRUPTED'
  | 'FULLSCREEN_ENTER'
  | 'FULLSCREEN_EXIT'
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'WINDOW_FOCUS';

export interface MonitoringEvent {
  id: string;
  teamId: string;
  teamName: string;
  roundKey: 'quiz' | 'coding' | 'bidding';
  type: MonitoringEventType;
  timestamp: number;
  details?: string;
}

export interface TeamMonitoringStatus {
  teamId: string;
  teamName: string;
  roundKey?: 'quiz' | 'coding' | 'bidding';
  cameraStatus: 'CONNECTED' | 'INTERRUPTED' | 'OFFLINE';
  fullscreenStatus: 'ACTIVE' | 'EXITED' | 'STANDBY';
  tabSwitchCount: number;
  fullscreenExitCount: number;
  warningCount: number;
  lastActivityAt: number;
}

export interface MonitoringViolationSettings {
  requireCamera: boolean;
  requireFullscreen: boolean;
  monitorTabSwitching: boolean;
  monitorWindowFocus: boolean;
  maxWarningsBeforeSuspension: number;
  maxViolationsBeforeReview: number;
  autoDisqualification: boolean;
}

