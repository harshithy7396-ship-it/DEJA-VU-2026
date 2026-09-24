import React from 'react';
import { useCompetition } from '../context/CompetitionContext';
import { ArrowLeft, Lock, Users, ShieldAlert } from 'lucide-react';

interface RoundEligibilityGateProps {
  roundKey: 'quiz' | 'coding' | 'bidding';
  roundName: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export const RoundEligibilityGate: React.FC<RoundEligibilityGateProps> = ({
  roundKey,
  roundName,
  onNavigate,
  children,
}) => {
  const { currentTeam, isRoundLockedForTeam } = useCompetition();

  const isLocked = isRoundLockedForTeam(roundKey);

  if (isLocked) {
    const isEliminated = currentTeam.status === 'Eliminated';
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/30 text-amber-500 mb-4">
            {isEliminated ? <ShieldAlert className="h-6 w-6 text-rose-500" /> : <Lock className="h-6 w-6" />}
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs text-neutral-600 dark:text-neutral-400 font-mono mb-4">
            <Users className="h-3.5 w-3.5 text-amber-500" />
            <span>
              {currentTeam.name || currentTeam.id} (#{currentTeam.teamNumber})
            </span>
          </div>

          <h2 className="text-xl font-bold text-neutral-950 dark:text-white">
            {isEliminated
              ? 'Thank you for your contribution to Déjà vu – Technical Event.'
              : `${roundName} is Currently Locked`}
          </h2>

          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
            {isEliminated
              ? 'Your journey in this edition has concluded as only advancing teams qualify for subsequent stages.'
              : 'This stage has not yet been unlocked by the organizers. Please wait for the official announcement.'}
          </p>

          <div className="mt-6">
            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
