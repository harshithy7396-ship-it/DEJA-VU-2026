import React, { useState } from 'react';
import { useCompetition } from '../context/CompetitionContext';
import { Lock, ArrowRight, Clock, Award, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { RoundStatus } from '../types/competition';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentTeam, rounds, getTeamRoundStatus, startQuizSession, isTeamLoggedIn } = useCompetition();

  // Expanded card details state (clicking card only expands/collapses details)
  const [expandedRound, setExpandedRound] = useState<string | null>('quiz');

  // If not logged in, prompt to log in
  if (!isTeamLoggedIn) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            Contestant Sign-In Required
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-6">
            Please log in with your assigned Team ID and password to access your team dashboard and contest rounds.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-2.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-sm hover:opacity-90 transition cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const isEliminated = currentTeam.status === 'Eliminated';

  const roundRoutes: Record<string, string> = {
    quiz: 'quiz',
    coding: 'coding',
    bidding: 'codebid',
  };

  const roundSubtitles: Record<string, string> = {
    quiz: 'MindSprint',
    coding: 'CodeRush',
    bidding: 'CodeBid',
  };

  const handleStartRound = (roundKey: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent collapsing card
    if (roundKey === 'quiz') {
      startQuizSession(currentTeam.id);
      onNavigate('quiz');
    } else {
      onNavigate(roundRoutes[roundKey]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 transition-colors duration-200">
      {/* Top Banner:
          Déjà vu – Technical Event
          Team Name
          Team Number
          Current Score */}
      <div className="border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/60 rounded-2xl p-6 sm:p-8 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-amber-600 dark:text-amber-400">
              Contestant Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 dark:text-white mt-0.5 font-serif">
              Déjà vu – Technical Event
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {currentTeam.name || `Team ${currentTeam.teamNumber}`}
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span>
                Team Number: <strong className="text-neutral-950 dark:text-white">#{currentTeam.teamNumber}</strong> ({currentTeam.id})
              </span>
              {isEliminated && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 border border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
                  Eliminated
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
                Current Score
              </div>
              <div className="text-3xl sm:text-4xl font-black text-neutral-950 dark:text-white font-mono">
                {currentTeam.totalScore}{' '}
                <span className="text-xs font-normal text-neutral-500">pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Eliminated Notice */}
      {isEliminated && (
        <div className="mb-8 p-5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200 text-center">
          <ShieldAlert className="w-6 h-6 text-rose-500 mx-auto mb-2" />
          <p className="text-base font-semibold">
            Thank you for your contribution to Déjà vu – Technical Event.
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Your journey concludes here as only the advancing qualified teams proceed to later rounds.
          </p>
        </div>
      )}

      {/* Three Round Cards:
          ROUND 1: QUIZ ROUND (MindSprint)
          ROUND 2: CODING ROUND (CodeRush)
          ROUND 3: BIDDING ROUND (CodeBid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rounds.map((round) => {
          const teamStatus: RoundStatus = getTeamRoundStatus(round.key, currentTeam.id);
          const isExpanded = expandedRound === round.key;

          const isLocked = teamStatus === 'LOCKED';
          const isReady = teamStatus === 'READY';
          const isActive = teamStatus === 'ACTIVE';
          const isCompleted = teamStatus === 'COMPLETED';
          const isRoundEliminated = teamStatus === 'ELIMINATED';

          return (
            <div
              key={round.id}
              onClick={() => setExpandedRound(isExpanded ? null : round.key)}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition duration-200 cursor-pointer ${
                isLocked || isRoundEliminated
                  ? 'border-neutral-200 bg-neutral-50/60 dark:border-neutral-800/80 dark:bg-neutral-900/30 opacity-80'
                  : 'border-neutral-200 bg-white hover:border-amber-400 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80 dark:hover:border-amber-400/50'
              }`}
            >
              <div>
                {/* Round Header & State Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400">
                    ROUND {round.roundNumber}
                  </span>
                  
                  {/* Status Badge */}
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                      isReady
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                        : isActive
                        ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300 animate-pulse'
                        : isCompleted
                        ? 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300'
                        : isRoundEliminated
                        ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300'
                        : 'bg-neutral-100 border-neutral-300 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'
                    }`}
                  >
                    {teamStatus}
                  </span>
                </div>

                {/* Round Title & Subtitle */}
                <h2 className="text-xl font-black text-neutral-950 dark:text-white font-serif">
                  {round.key === 'quiz'
                    ? 'QUIZ ROUND'
                    : round.key === 'coding'
                    ? 'CODING ROUND'
                    : 'BIDDING ROUND'}
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-4">
                  {roundSubtitles[round.key]}
                </p>

                {/* Status, Start Time, Duration */}
                <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300 mb-4 border-y border-neutral-200 dark:border-neutral-800 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Status</span>
                    <span className="font-bold uppercase text-neutral-900 dark:text-neutral-100">{teamStatus}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Start Time</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {round.startTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Duration</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{round.duration}</span>
                  </div>
                </div>

                {/* Expandable Rules (Clicking card reveals rules) */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                    <span>Round Rules</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? 'Hide' : 'Details'}
                    </span>
                  </div>
                  {isExpanded && (
                    <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 list-disc list-inside bg-neutral-50 dark:bg-neutral-950/60 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      {round.rules.map((rule, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {rule}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Action Button:
                  IMPORTANT: Clicking card does NOT start round.
                  Only the explicit [START ROUND] / [CONTINUE ROUND] button enters the round. */}
              <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                {isRoundEliminated ? (
                  <div className="text-center py-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Not eligible for this round
                  </div>
                ) : isCompleted ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Round Completed</span>
                  </div>
                ) : isLocked ? (
                  <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>LOCKED</span>
                  </div>
                ) : isReady ? (
                  <button
                    type="button"
                    onClick={(e) => handleStartRound(round.key, e)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-bold text-xs transition cursor-pointer shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>START ROUND</span>
                  </button>
                ) : isActive ? (
                  <button
                    type="button"
                    onClick={(e) => handleStartRound(round.key, e)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer shadow-sm"
                  >
                    <span>CONTINUE ROUND</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
