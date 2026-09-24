import React, { useState } from 'react';
import { useCompetition } from '../context/CompetitionContext';
import { ContestModeGuard } from '../components/ContestModeGuard';
import { Coins, Lock, HelpCircle, Trophy, AlertCircle, ArrowUpRight, ShieldAlert, Award } from 'lucide-react';

interface CodeBidPageProps {
  onNavigate: (page: string) => void;
}

export const CodeBidPage: React.FC<CodeBidPageProps> = ({ onNavigate }) => {
  const {
    currentTeam,
    codeBidSettings,
    currentRiddle,
    placeBid,
    riddles,
    getTeamRoundStatus,
  } = useCompetition();

  const roundStatus = getTeamRoundStatus('bidding', currentTeam.id);
  const isLocked = roundStatus === 'LOCKED';
  const isEliminated = roundStatus === 'ELIMINATED' || currentTeam.status === 'Eliminated';

  const [bidAmount, setBidAmount] = useState<number>(() => {
    return (currentRiddle?.currentBid || 0) + (codeBidSettings.bidIncrement || 10);
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (isLocked || isEliminated) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 text-center">
        <div className="p-8 max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          {isEliminated ? (
            <>
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">Round 3 (CodeBid)</h2>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                Thank you for your contribution to Déjà vu – Technical Event.
              </p>
              <p className="text-xs text-neutral-500 mb-6">
                Only the Top 5 qualifying teams from Round 2 participate in the CodeBid live auction.
              </p>
            </>
          ) : (
            <>
              <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">CodeBid is Locked</h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-6">
                The bidding auction has not been opened yet. Only qualified finalists can enter when live.
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

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = placeBid(bidAmount);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setBidAmount(bidAmount + codeBidSettings.bidIncrement);
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const isBiddingOpen = codeBidSettings.auctionState === 'bidding';
  const isSolving = codeBidSettings.auctionState === 'solving';
  const minRequiredBid = currentRiddle.currentBid + codeBidSettings.bidIncrement;

  return (
    <ContestModeGuard
      roundKey="bidding"
      roundTitle="Round 3: CodeBid Auction"
      roundDuration="Live Auction"
      onExit={() => onNavigate('dashboard')}
      isCompleted={codeBidSettings.status === 'COMPLETED'}
    >
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 transition-colors duration-200">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 dark:bg-neutral-900/80 dark:border-neutral-800 rounded-2xl p-6 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <span>Round 3</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span>CodeBid</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white mt-0.5 font-serif">
            {codeBidSettings.isTieBreaker ? 'Tie-Breaker Riddle' : `Riddle #${currentRiddle.riddleNumber || 1} of ${riddles.length}`}
          </h1>
        </div>

        {/* Team Coin Balance */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                Your Coins
              </span>
              <span className="text-lg font-black text-neutral-950 dark:text-white font-mono">
                {currentTeam.coins}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Current Riddle & Bidding Interface */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>{currentRiddle.title}</span>
              </span>

              <span
                className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                  isBiddingOpen
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse'
                    : isSolving
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {codeBidSettings.auctionState}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-medium text-neutral-900 dark:text-neutral-100 leading-relaxed bg-neutral-50 dark:bg-neutral-950/70 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 mb-6">
              "{currentRiddle.riddleText}"
            </h3>

            {/* Bidding Status */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 dark:bg-neutral-950/60 dark:border-neutral-800">
                <span className="text-[11px] uppercase font-bold text-neutral-500 block mb-1">
                  Current Highest Bid
                </span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {currentRiddle.currentBid} coins
                </span>
                <span className="text-xs text-neutral-500 block mt-1">
                  by {currentRiddle.highestBidderTeamName || 'No bids yet'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 dark:bg-neutral-950/60 dark:border-neutral-800">
                <span className="text-[11px] uppercase font-bold text-neutral-500 block mb-1">
                  Potential Reward
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {currentRiddle.currentBid * 2} pts
                </span>
                <span className="text-xs text-neutral-500 block mt-1">
                  (Double your winning bid)
                </span>
              </div>
            </div>

            {/* Solver status if solving */}
            {isSolving && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs mb-6">
                <strong>Current Solver:</strong> {currentRiddle.highestBidderTeamName} has the floor! If they answer correctly, they earn {currentRiddle.currentBid * 2} points. If not, the opportunity passes to the next highest bidder.
              </div>
            )}

            {/* Bid Form */}
            {isBiddingOpen ? (
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Your Bid (Min: {minRequiredBid} coins)
                    </label>
                    <input
                      type="number"
                      min={minRequiredBid}
                      max={currentTeam.coins}
                      step={codeBidSettings.bidIncrement}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-base font-bold font-mono text-neutral-950 dark:text-white focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-bold text-sm transition shadow-sm cursor-pointer"
                    >
                      Place Bid
                    </button>
                  </div>
                </div>

                {feedback && (
                  <div
                    className={`p-3 rounded-lg text-xs font-medium ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}
              </form>
            ) : (
              <div className="text-center py-4 text-xs text-neutral-500">
                {isSolving ? 'Solving in progress...' : 'Bidding is currently paused or closed by the referee.'}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Bids History */}
        <div className="bg-white border border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Live Bid Log
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                {currentRiddle.bidsHistory.length} bids
              </span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {currentRiddle.bidsHistory.length === 0 ? (
                <div className="text-xs text-neutral-400 text-center py-8">
                  No bids placed for this riddle yet.
                </div>
              ) : (
                currentRiddle.bidsHistory.map((bid, idx) => (
                  <div
                    key={bid.id || idx}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      idx === 0
                        ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800/80 dark:bg-amber-950/30'
                        : 'border-neutral-200 bg-neutral-50/50 dark:border-neutral-800/60 dark:bg-neutral-950/40'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-neutral-900 dark:text-white block">
                        {bid.bidderTeamName}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {bid.timestamp}
                      </span>
                    </div>
                    <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                      {bid.amount} coins
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <button
              onClick={() => onNavigate('leaderboard')}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold"
            >
              View Live Leaderboard →
            </button>
          </div>
        </div>
      </div>
      </div>
    </ContestModeGuard>
  );
};
