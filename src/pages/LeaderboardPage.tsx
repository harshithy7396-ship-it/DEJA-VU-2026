import React from 'react';
import { useCompetition } from '../context/CompetitionContext';
import { Trophy, Award, Medal } from 'lucide-react';

interface LeaderboardPageProps {
  onNavigate: (page: string) => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onNavigate }) => {
  const { teams, currentTeamId, rounds } = useCompetition();

  // Filter registered or named teams, then sort by totalScore -> quizScore -> teamNumber
  const activeTeams = teams.filter((t) => t.registrationStatus === 'Registered' || t.name.trim().length > 0);

  const sortedTeams = [...activeTeams].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.quizScore !== a.quizScore) return b.quizScore - a.quizScore;
    return a.teamNumber - b.teamNumber;
  });

  const round3Status = rounds.find((r) => r.key === 'bidding')?.status;
  const isRound3Active = round3Status === 'ACTIVE' || round3Status === 'COMPLETED';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 transition-colors duration-200">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Déjà vu – Official Standings</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-neutral-950 dark:text-white font-serif">
          Contest Leaderboard
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {isRound3Active
            ? 'Finalists Stage – Live Final Rankings'
            : 'Top 5 positions are highlighted for Round 3 qualification'}
        </p>
      </div>

      {/* Leaderboard Table: Rank | Team | Round 1 | Round 2 | Round 3 | Total */}
      <div className="bg-white border border-neutral-200 dark:bg-neutral-900/70 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4">Team</th>
                <th className="py-3.5 px-4 text-center font-mono">Round 1</th>
                <th className="py-3.5 px-4 text-center font-mono">Round 2</th>
                <th className="py-3.5 px-4 text-center font-mono">Round 3</th>
                <th className="py-3.5 px-4 text-right font-mono pr-6">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {sortedTeams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-neutral-400">
                    No teams registered yet.
                  </td>
                </tr>
              ) : (
                sortedTeams.map((team, index) => {
                  const rank = index + 1;
                  const isTop5 = rank <= 5;
                  const isCurrentTeam = team.id === currentTeamId;

                  return (
                    <tr
                      key={team.id}
                      className={`transition ${
                        isCurrentTeam
                          ? 'bg-amber-50/80 dark:bg-amber-950/30'
                          : isTop5
                          ? 'bg-white hover:bg-neutral-50 dark:bg-neutral-900/40 dark:hover:bg-neutral-900/70'
                          : 'bg-white hover:bg-neutral-50 dark:bg-neutral-900/20 dark:hover:bg-neutral-900/50 opacity-80'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 text-center font-bold font-mono">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-neutral-950 text-xs font-black shadow-xs">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-neutral-900 text-xs font-bold">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-bold">
                            3
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-xs">{rank}</span>
                        )}
                      </td>

                      {/* Team Name */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-950 dark:text-white">
                            {team.name || `Team ${team.teamNumber}`}
                          </span>
                          <span className="text-xs text-neutral-400 font-mono">
                            ({team.id})
                          </span>
                          {isTop5 && (
                            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                              TOP 5
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Round 1 (Quiz) */}
                      <td className="py-4 px-4 text-center font-mono text-neutral-700 dark:text-neutral-300 text-xs">
                        {team.quizScore} pts
                      </td>

                      {/* Round 2 (CodeRush) */}
                      <td className="py-4 px-4 text-center font-mono text-neutral-700 dark:text-neutral-300 text-xs">
                        {team.codeScore} pts
                      </td>

                      {/* Round 3 (CodeBid) */}
                      <td className="py-4 px-4 text-center font-mono text-neutral-700 dark:text-neutral-300 text-xs">
                        {team.bidScore} pts
                      </td>

                      {/* Total Score */}
                      <td className="py-4 px-4 text-right font-mono font-black text-neutral-950 dark:text-white text-base pr-6">
                        {team.totalScore}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
        >
          ← Return to Dashboard
        </button>
      </div>
    </div>
  );
};
