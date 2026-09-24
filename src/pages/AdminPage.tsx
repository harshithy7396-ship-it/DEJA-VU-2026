import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCompetition } from '../context/CompetitionContext';
import {
  Shield,
  Users,
  HelpCircle,
  Code2,
  Coins,
  Trophy,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  RotateCcw,
  ExternalLink,
  Lock,
  Unlock,
  AlertTriangle,
  Award,
  Camera,
  VideoOff,
  Maximize2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Key,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Sliders,
} from 'lucide-react';
import { RoundStatus, Team, MonitoringEventType } from '../types/competition';

interface AdminPageProps {
  onNavigate: (page: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const {
    isAdmin,
    loginAdmin,
    logoutAdmin,
    teams,
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
    updateTeamMonitoringState,
    rounds,
    setRoundStatus,
    quizSettings,
    updateQuizSettings,
    quizQuestions,
    addQuizQuestion,
    editQuizQuestion,
    deleteQuizQuestion,
    resetQuizSession,
    codeRushSettings,
    updateCodeRushSettings,
    editCodingProblem,
    computeRound2Elimination,
    codeBidSettings,
    updateCodeBidSettings,
    riddles,
    currentRiddle,
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
  } = useCompetition();

  // Admin Auth Gate State
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Admin Active Tab: Teams | Monitoring | MindSprint | CodeRush | CodeBid | Leaderboard | Settings
  const [activeTab, setActiveTab] = useState<
    'teams' | 'monitoring' | 'quiz' | 'coding' | 'bidding' | 'leaderboard' | 'settings'
  >('teams');

  // Team Slot Edit Modal State
  const [editingTeamNumber, setEditingTeamNumber] = useState<number | null>(null);
  const [editCustomId, setEditCustomId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editMembers, setEditMembers] = useState('');
  const [editPasscode, setEditPasscode] = useState('');
  const [teamFormError, setTeamFormError] = useState('');

  // CSV Import Modal State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvStatus, setCsvStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Monitoring Tab Filters
  const [monitoringTeamFilter, setMonitoringTeamFilter] = useState<string>('ALL');
  const [monitoringTypeFilter, setMonitoringTypeFilter] = useState<string>('ALL');
  const [serverEvents, setServerEvents] = useState(monitoringEvents);

  // Rule Settings Form State
  const [localSettings, setLocalSettings] = useState(monitoringSettings);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  useEffect(() => {
    setLocalSettings(monitoringSettings);
  }, [monitoringSettings]);

  // Periodic poll of server-side monitoring events when monitoring tab is active
  useEffect(() => {
    if (activeTab !== 'monitoring') return;
    const fetchEvents = () => {
      fetch('/api/monitoring/events')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data)) {
            setServerEvents(data);
          }
        })
        .catch(() => {});
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Manual Question Create State
  const [showAddQModal, setShowAddQModal] = useState(false);
  const [newQText, setNewQText] = useState('');
  const [newQOpts, setNewQOpts] = useState(['', '', '', '']);
  const [newQCorrect, setNewQCorrect] = useState(0);

  // Tie-breaker custom inputs
  const [tieBreakerText, setTieBreakerText] = useState('');
  const [tieBreakerAns, setTieBreakerAns] = useState('');

  // 1. Guard: Check Admin Authentication
  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm text-center">
          <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">
            Admin Authentication Required
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-6">
            Enter the authorized organizer password to access the Déjà vu Control Center.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setAuthError('');
              setIsAuthenticating(true);
              try {
                const ok = await loginAdmin(passcode);
                if (ok) {
                  setPasscode('');
                } else {
                  setAuthError('Invalid admin passcode. Access denied.');
                }
              } catch {
                setAuthError('Authentication error. Please retry.');
              } finally {
                setIsAuthenticating(false);
              }
            }}
            className="space-y-4"
          >
            <input
              type="password"
              placeholder="Admin passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 transition"
              autoFocus
            />

            {authError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {authError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAuthenticating}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Authenticate'
                )}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Handle Team Editing
  const startEditTeam = (team: Team) => {
    setEditingTeamNumber(team.teamNumber);
    setEditCustomId(team.id);
    setEditName(team.name);
    setEditDepartment(team.department || '');
    setEditMembers(team.members.join(', '));
    setEditPasscode(team.passcode);
    setTeamFormError('');
  };

  const handleGenerateCredentialsForSlot = () => {
    if (!editingTeamNumber) return;
    const creds = generateTeamCredentials(editingTeamNumber);
    setEditCustomId(creds.teamId);
    setEditPasscode(creds.passcode);
  };

  const saveEditTeam = () => {
    if (!editingTeamNumber) return;
    const membersArr = editMembers.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const res = registerTeamSlot(
      editingTeamNumber,
      editName,
      membersArr,
      editPasscode,
      editDepartment,
      editCustomId
    );
    if (!res.success) {
      setTeamFormError(res.error || 'Failed to save team');
      return;
    }
    setEditingTeamNumber(null);
  };

  const handleBatchGenerateCredentials = () => {
    if (!window.confirm('Generate fresh credentials for all 25 team slots?')) return;
    teams.forEach((t) => {
      const creds = generateTeamCredentials(t.teamNumber);
      updateTeam(t.id, {
        id: creds.teamId,
        passcode: creds.passcode,
      });
    });
  };

  // CSV Export
  const handleExportCsv = () => {
    const csvData = exportTeamsToCsv();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dejavu_teams_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const handleImportCsvSubmit = () => {
    setCsvStatus(null);
    if (!csvContent.trim()) {
      setCsvStatus({ type: 'error', message: 'Please provide CSV content to import.' });
      return;
    }
    const res = importTeamsFromCsv(csvContent);
    if (res.success) {
      setCsvStatus({ type: 'success', message: `Successfully registered/updated ${res.count} teams.` });
      setTimeout(() => {
        setShowCsvModal(false);
        setCsvContent('');
        setCsvStatus(null);
      }, 1500);
    } else {
      setCsvStatus({ type: 'error', message: res.error || 'Import failed.' });
    }
  };

  // Monitoring Rules Save
  const handleSaveMonitoringSettings = () => {
    updateMonitoringSettings(localSettings);
    setSettingsSavedMessage(true);
    setTimeout(() => setSettingsSavedMessage(false), 3000);
  };

  // Reset Monitoring History
  const handleResetMonitoringLogs = async () => {
    if (!window.confirm('Clear all monitoring violations and audit logs?')) return;
    try {
      await fetch('/api/monitoring/reset', { method: 'POST' });
      setServerEvents([]);
    } catch {}
  };

  // Filtered Events
  const displayedEvents = useMemo(() => {
    const source = serverEvents.length > 0 ? serverEvents : monitoringEvents;
    return source.filter((e) => {
      const matchesTeam = monitoringTeamFilter === 'ALL' || e.teamId === monitoringTeamFilter;
      const matchesType = monitoringTypeFilter === 'ALL' || e.type === monitoringTypeFilter;
      return matchesTeam && matchesType;
    });
  }, [serverEvents, monitoringEvents, monitoringTeamFilter, monitoringTypeFilter]);

  // Aggregate Monitoring Stats
  const monitoringStats = useMemo(() => {
    const statuses = Object.values(teamMonitoringStatus);
    const activeStreams = statuses.filter((s) => s.cameraStatus === 'CONNECTED').length;
    const cameraDisconnected = statuses.filter((s) => s.cameraStatus === 'INTERRUPTED').length;
    const fullscreenActive = statuses.filter((s) => s.fullscreenStatus === 'ACTIVE').length;
    const fullscreenExited = statuses.filter((s) => s.fullscreenStatus === 'EXITED').length;
    const totalWarnings = statuses.reduce((acc, curr) => acc + curr.warningCount, 0);

    return {
      totalMonitored: statuses.length,
      activeStreams,
      cameraDisconnected,
      fullscreenActive,
      fullscreenExited,
      totalWarnings,
    };
  }, [teamMonitoringStatus]);

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) return;
    addQuizQuestion({
      question: newQText.trim(),
      options: newQOpts.map((o) => o.trim() || 'Option'),
      correctIndex: newQCorrect,
      points: 2,
    });
    setNewQText('');
    setNewQOpts(['', '', '', '']);
    setNewQCorrect(0);
    setShowAddQModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 transition-colors duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Organizer Panel
            </span>
            <h1 className="text-xl font-bold text-neutral-950 dark:text-white">
              Déjà vu Admin Control Center
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            Contestant View
          </button>
          <button
            onClick={logoutAdmin}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition cursor-pointer"
          >
            Exit Admin
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-neutral-100 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 mb-6">
        {[
          { key: 'teams', label: 'Teams (25)', icon: Users },
          { key: 'monitoring', label: 'Monitoring & Integrity', icon: Camera },
          { key: 'quiz', label: 'MindSprint (Round 1)', icon: HelpCircle },
          { key: 'coding', label: 'CodeRush (Round 2)', icon: Code2 },
          { key: 'bidding', label: 'CodeBid (Round 3)', icon: Coins },
          { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          { key: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: TEAMS MANAGEMENT (Exactly 25 team slots)           */}
      {/* ========================================================= */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                  Contest Teams Management
                </h3>
                <p className="text-xs text-neutral-500">
                  Exactly 25 slots available. Team IDs can be customized (e.g. CT2026, T01).
                </p>
              </div>

              {/* Action Buttons: Batch Generate, Import, Export */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBatchGenerateCredentials}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  title="Generate IDs and passwords for all slots"
                >
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>Batch Generate IDs</span>
                </button>
                <button
                  onClick={() => setShowCsvModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 uppercase">
                  <tr>
                    <th className="py-3 px-3">Slot #</th>
                    <th className="py-3 px-3">Team ID</th>
                    <th className="py-3 px-3">Team Name</th>
                    <th className="py-3 px-3">Dept/Branch</th>
                    <th className="py-3 px-3">Members</th>
                    <th className="py-3 px-3">Password</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Score</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {teams.map((t) => (
                    <tr key={t.teamNumber} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40">
                      <td className="py-3 px-3 font-mono font-bold text-neutral-900 dark:text-white">
                        #{String(t.teamNumber).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {t.id}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-neutral-950 dark:text-neutral-100">
                          {t.name || <em className="text-neutral-400 font-normal">Unassigned</em>}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-500">
                        {t.department || '—'}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400 max-w-[200px] truncate">
                        {t.members.length > 0 ? t.members.join(', ') : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-500">
                        {t.passcode}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-neutral-900 dark:text-white">
                        {t.totalScore}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => startEditTeam(t)}
                          className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-amber-500 font-semibold transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleTeamStatus(t.id)}
                          className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                        >
                          {t.status === 'Active' ? 'Eliminate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteTeamSlot(t.id)}
                          title="Clear registration details for this slot"
                          className="px-2 py-1 rounded text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Team Modal */}
          {editingTeamNumber !== null && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                    Edit Team Slot #{editingTeamNumber}
                  </h3>
                  <button
                    onClick={() => setEditingTeamNumber(null)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {teamFormError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{teamFormError}</span>
                  </div>
                )}

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Team ID (Custom)
                      </label>
                      <input
                        type="text"
                        value={editCustomId}
                        onChange={(e) => setEditCustomId(e.target.value.toUpperCase())}
                        placeholder="e.g. CT2026, T01"
                        className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Department / Branch
                      </label>
                      <input
                        type="text"
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                        placeholder="e.g. CSE / IT / ECE"
                        className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Team Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Code Gladiators"
                      className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Team Members (comma or semicolon separated)
                    </label>
                    <input
                      type="text"
                      value={editMembers}
                      onChange={(e) => setEditMembers(e.target.value)}
                      placeholder="e.g. Alice Sharma, Bob Rao, Clara V"
                      className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-neutral-700 dark:text-neutral-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateCredentialsForSlot}
                        className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Generate ID & Pass
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editPasscode}
                      onChange={(e) => setEditPasscode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={() => setEditingTeamNumber(null)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditTeam}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer transition shadow-md shadow-amber-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Import CSV Modal */}
          {showCsvModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-base font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-500" />
                    <span>Import Teams from CSV</span>
                  </h3>
                  <button
                    onClick={() => {
                      setShowCsvModal(false);
                      setCsvStatus(null);
                    }}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-neutral-500 mb-3">
                  Upload a <code>.csv</code> file or paste CSV content below. Required format:
                </p>

                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 mb-3 select-all">
                  Team Number,Team Name,Team ID,Password,Members,Department
                </div>

                <div className="mb-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:border-amber-500 hover:text-amber-600 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Choose CSV File from Computer</span>
                  </button>
                </div>

                <div className="mb-4">
                  <textarea
                    rows={6}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="1,Cyber Knights,CT01,DV@2026,Alice;Bob,CSE"
                    className="w-full p-3 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-xs font-mono text-neutral-900 dark:text-white"
                  />
                </div>

                {csvStatus && (
                  <div
                    className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                      csvStatus.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {csvStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    )}
                    <span>{csvStatus.message}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={() => setShowCsvModal(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportCsvSubmit}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer transition shadow-md shadow-amber-500/20"
                  >
                    Process Import
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MONITORING & ANTI-CHEATING INTEGRITY DASHBOARD     */}
      {/* ========================================================= */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                Monitored Teams
              </span>
              <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white font-mono">
                {monitoringStats.totalMonitored}
              </div>
              <span className="text-[11px] text-neutral-500">Live in contest mode</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                Webcam Status
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                {monitoringStats.activeStreams}
                {monitoringStats.cameraDisconnected > 0 && (
                  <span className="text-xs font-bold text-rose-500">
                    ({monitoringStats.cameraDisconnected} offline)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-neutral-500">Continuous video feeds</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                Fullscreen Active
              </span>
              <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white font-mono">
                {monitoringStats.fullscreenActive}
                {monitoringStats.fullscreenExited > 0 && (
                  <span className="text-xs font-bold text-amber-500 ml-1">
                    ({monitoringStats.fullscreenExited} exited)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-neutral-500">Locked contest screen</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                Total Warnings
              </span>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {monitoringStats.totalWarnings}
              </div>
              <span className="text-[11px] text-neutral-500">Tab switches & exits</span>
            </div>
          </div>

          {/* Violation Rules & Configuration Card */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                  Contest Mode Rules & Violation Settings
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {settingsSavedMessage && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Settings Saved
                  </span>
                )}
                <button
                  onClick={handleSaveMonitoringSettings}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs cursor-pointer transition shadow-xs"
                >
                  Save Rules
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.requireCamera}
                  onChange={(e) => setLocalSettings({ ...localSettings, requireCamera: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block">Require Camera</span>
                  <span className="text-[11px] text-neutral-400">Blocks entry without video</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.requireFullscreen}
                  onChange={(e) => setLocalSettings({ ...localSettings, requireFullscreen: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block">Require Fullscreen</span>
                  <span className="text-[11px] text-neutral-400">Enforces full browser screen</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.monitorTabSwitching}
                  onChange={(e) => setLocalSettings({ ...localSettings, monitorTabSwitching: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block">Monitor Tab Switching</span>
                  <span className="text-[11px] text-neutral-400">Detects hidden visibility</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.monitorWindowFocus}
                  onChange={(e) => setLocalSettings({ ...localSettings, monitorWindowFocus: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block">Monitor Focus / Blur</span>
                  <span className="text-[11px] text-neutral-400">Logs window blur events</span>
                </div>
              </label>
            </div>
          </div>

          {/* Real-time Team Monitoring Status Table */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                <span>Active Teams Monitoring Status</span>
              </h3>
              <span className="text-[11px] text-neutral-400">
                Auto-refreshed with real-time browser heartbeats
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Team ID</th>
                    <th className="py-2.5 px-3">Team Name</th>
                    <th className="py-2.5 px-3">Round</th>
                    <th className="py-2.5 px-3">Camera</th>
                    <th className="py-2.5 px-3">Fullscreen</th>
                    <th className="py-2.5 px-3 text-center">Tab Switches</th>
                    <th className="py-2.5 px-3 text-center">Exits</th>
                    <th className="py-2.5 px-3 text-center">Warnings</th>
                    <th className="py-2.5 px-3">Last Active</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {teams.map((t) => {
                    const st = teamMonitoringStatus[t.id];
                    const hasStatus = Boolean(st);
                    return (
                      <tr key={t.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {t.id}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-white">
                          {t.name || `Team ${t.teamNumber}`}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-neutral-500">
                          {st?.roundKey || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {hasStatus ? (
                            st.cameraStatus === 'CONNECTED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                CONNECTED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                                <VideoOff className="w-3 h-3 text-rose-500" />
                                INTERRUPTED
                              </span>
                            )
                          ) : (
                            <span className="text-neutral-400">Standby</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {hasStatus ? (
                            st.fullscreenStatus === 'ACTIVE' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                                <Maximize2 className="w-3 h-3 text-emerald-500" />
                                ACTIVE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                EXITED
                              </span>
                            )
                          ) : (
                            <span className="text-neutral-400">Standby</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">
                          {st?.tabSwitchCount || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">
                          {st?.fullscreenExitCount || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                              (st?.warningCount || 0) > 0
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                            }`}
                          >
                            {st?.warningCount || 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-400">
                          {st?.lastActivityAt ? new Date(st.lastActivityAt).toLocaleTimeString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              updateTeamMonitoringState(t.id, {
                                warningCount: 0,
                                tabSwitchCount: 0,
                                fullscreenExitCount: 0,
                              });
                            }}
                            className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-amber-500 transition cursor-pointer"
                          >
                            Reset Warnings
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Event Log Feed */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Real-time Anti-Cheating Event Audit Log</span>
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Logs every camera change, fullscreen toggle, tab switch, and window blur event.
                </p>
              </div>

              {/* Filters & Clear */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={monitoringTeamFilter}
                  onChange={(e) => setMonitoringTeamFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-xs font-mono"
                >
                  <option value="ALL">All Teams</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} ({t.name || `Team ${t.teamNumber}`})
                    </option>
                  ))}
                </select>

                <select
                  value={monitoringTypeFilter}
                  onChange={(e) => setMonitoringTypeFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-xs font-mono"
                >
                  <option value="ALL">All Events</option>
                  <option value="CAMERA_CONNECTED">Camera Connected</option>
                  <option value="CAMERA_INTERRUPTED">Camera Interrupted</option>
                  <option value="FULLSCREEN_ENTER">Fullscreen Enter</option>
                  <option value="FULLSCREEN_EXIT">Fullscreen Exit</option>
                  <option value="TAB_SWITCH">Tab Switch</option>
                  <option value="WINDOW_BLUR">Window Blur</option>
                  <option value="WINDOW_FOCUS">Window Focus</option>
                </select>

                <button
                  onClick={handleResetMonitoringLogs}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  Clear History
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {displayedEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-950/40 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  No monitoring events recorded yet.
                </div>
              ) : (
                displayedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-950/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          ev.type.includes('INTERRUPTED') || ev.type.includes('EXIT') || ev.type === 'TAB_SWITCH'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {ev.type}
                      </span>
                      <span className="font-bold text-neutral-950 dark:text-white font-mono">
                        {ev.teamId}
                      </span>
                      <span className="text-neutral-500">
                        {ev.teamName}
                      </span>
                      <span className="text-neutral-400 text-[11px]">—</span>
                      <span className="text-neutral-600 dark:text-neutral-300">
                        {ev.details}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MINDSPRINT (ROUND 1 QUIZ)                          */}
      {/* ========================================================= */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          {/* Status and Controls */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Round 1 Controls
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase">
                  Status: {quizSettings.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white">
                MindSprint Quiz Settings & Status
              </h3>
              <p className="text-xs text-neutral-500">
                25 questions • 2 pts per question • 30 seconds per question (12m 30s)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRoundStatus('quiz', 'READY')}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  quizSettings.status === 'READY'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Set READY
              </button>
              <button
                onClick={() => setRoundStatus('quiz', 'ACTIVE')}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  quizSettings.status === 'ACTIVE'
                    ? 'bg-amber-500 text-neutral-950 border-amber-500'
                    : 'border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Open Round 1 (ACTIVE)
              </button>
              <button
                onClick={() => setRoundStatus('quiz', 'COMPLETED')}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  quizSettings.status === 'COMPLETED'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Close Round 1
              </button>
            </div>
          </div>

          {/* Questions Bank */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-neutral-950 dark:text-white">
                  Quiz Questions ({quizQuestions.length} Questions)
                </h4>
                <p className="text-xs text-neutral-500">
                  Admin can add, modify, or inspect all questions and correct answer keys.
                </p>
              </div>
              <button
                onClick={() => setShowAddQModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-400"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            <div className="space-y-3">
              {quizQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-amber-600 dark:text-amber-400 mr-2 font-mono">
                        Q{idx + 1}.
                      </span>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {q.question}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteQuizQuestion(q.id)}
                      className="text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/60 font-mono text-[11px]">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-1.5 rounded border ${
                          oIdx === q.correctIndex
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 font-bold'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-400'
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}. {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Question Modal */}
          {showAddQModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-lg w-full shadow-lg">
                <h3 className="text-base font-bold text-neutral-950 dark:text-white mb-4">
                  Add New Quiz Question
                </h3>

                <form onSubmit={handleCreateQuestion} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Question Text
                    </label>
                    <textarea
                      rows={2}
                      value={newQText}
                      onChange={(e) => setNewQText(e.target.value)}
                      placeholder="e.g. Which data structure operates on a FIFO basis?"
                      className="w-full p-2.5 rounded-lg border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300">
                      Options & Correct Answer
                    </label>
                    {newQOpts.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-bold text-neutral-400 w-4">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newQOpts];
                            updated[i] = e.target.value;
                            setNewQOpts(updated);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          className="flex-1 p-2 rounded-lg border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white"
                          required
                        />
                        <input
                          type="radio"
                          name="correctOpt"
                          checked={newQCorrect === i}
                          onChange={() => setNewQCorrect(i)}
                          title="Mark as correct answer"
                          className="cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddQModal(false)}
                      className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-amber-500 text-neutral-950 font-bold cursor-pointer"
                    >
                      Save Question
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: CODERUSH (ROUND 2 CODING)                          */}
      {/* ========================================================= */}
      {activeTab === 'coding' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Round 2 Controls
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase">
                  Status: {codeRushSettings.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white">
                CodeRush Platform & Qualification
              </h3>
              <p className="text-xs text-neutral-500">
                Top 15 qualified from Quiz participate • Top 5 advance to CodeBid
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRoundStatus('coding', 'ACTIVE')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs cursor-pointer hover:bg-amber-400"
              >
                Open Round 2 (ACTIVE)
              </button>
              <button
                onClick={() => setRoundStatus('coding', 'COMPLETED')}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Close Round 2
              </button>
              <button
                onClick={computeRound2Elimination}
                className="px-4 py-2 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold cursor-pointer"
              >
                Auto-Eliminate Below Top 5
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: CODEBID (ROUND 3 AUCTION)                          */}
      {/* ========================================================= */}
      {activeTab === 'bidding' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Round 3 Controls
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase">
                  Status: {codeBidSettings.status} • State: {codeBidSettings.auctionState}
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white">
                CodeBid Live Auction Master
              </h3>
              <p className="text-xs text-neutral-500">
                100 Starting Coins • Top 5 Finalists • Current Riddle #{currentRiddle.riddleNumber || 1}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRoundStatus('bidding', 'ACTIVE')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs cursor-pointer hover:bg-amber-400"
              >
                Open Round 3 (ACTIVE)
              </button>
              <button
                onClick={() => setRoundStatus('bidding', 'COMPLETED')}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Close Round 3
              </button>
            </div>
          </div>

          {/* Auction Flow Controls */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">
              Live Auctioneer Controls
            </h4>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={startAuction}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start / Resume Bidding</span>
              </button>

              <button
                onClick={pauseAuction}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Pause Timer
              </button>

              <button
                onClick={closeAuction}
                className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs cursor-pointer"
              >
                Close Auction (Lock Highest Bid)
              </button>

              <button
                onClick={revealHighestBidder}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold text-xs cursor-pointer"
              >
                Reveal Riddle to Highest Bidder
              </button>

              <button
                onClick={() => markSolvingResult(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Solved Correctly (+30 pts)</span>
              </button>

              <button
                onClick={() => markSolvingResult(false)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Incorrect! Pass to Next Bidder</span>
              </button>

              <button
                onClick={nextRiddle}
                className="ml-auto px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Next Riddle →
              </button>
            </div>
          </div>

          {/* Tie-Breaker Trigger */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
              Tie-Breaker Riddle (For First Place Ties)
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Custom tie-breaker riddle (optional)"
                value={tieBreakerText}
                onChange={(e) => setTieBreakerText(e.target.value)}
                className="flex-1 p-2 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-xs"
              />
              <button
                onClick={() => startTieBreaker(tieBreakerText, tieBreakerAns)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs cursor-pointer"
              >
                Launch Tie-Breaker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: LEADERBOARD PREVIEW                                */}
      {/* ========================================================= */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-neutral-950 dark:text-white">
              Live Standings Overview
            </h3>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline"
            >
              Open Full Leaderboard →
            </button>
          </div>

          <div className="space-y-2">
            {teams
              .filter((t) => t.registrationStatus === 'Registered' || t.name.trim().length > 0)
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-6 text-neutral-400">#{idx + 1}</span>
                    <span className="font-bold text-neutral-950 dark:text-white">
                      {t.name || t.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span>Q: {t.quizScore}</span>
                    <span>C: {t.codeScore}</span>
                    <span>B: {t.bidScore}</span>
                    <strong className="text-neutral-950 dark:text-white">{t.totalScore} pts</strong>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: GLOBAL SETTINGS                                    */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-neutral-950 dark:text-white mb-1">
              Event Configuration
            </h3>
            <p className="text-xs text-neutral-500">
              Déjà vu – Technical Event • 1 October 2026 • 10:00 AM – 1:00 PM
            </p>
          </div>

          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase mb-2">
              Danger Zone
            </h4>
            <button
              onClick={() => {
                if (window.confirm('Reset all competition state back to factory defaults?')) {
                  resetCompetitionData();
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold cursor-pointer"
            >
              Reset Competition State to Initial
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
