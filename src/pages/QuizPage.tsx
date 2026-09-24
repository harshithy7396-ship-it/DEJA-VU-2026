import React, { useState, useEffect, useCallback } from 'react';
import { useCompetition } from '../context/CompetitionContext';
import { Clock, ChevronRight, Lock } from 'lucide-react';
import { TeamQuizSession } from '../types/competition';
import { ContestModeGuard } from '../components/ContestModeGuard';

interface QuizPageProps {
  onNavigate: (page: string) => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({ onNavigate }) => {
  const {
    currentTeam,
    quizSettings,
    getTeamRoundStatus,
    getQuizSession,
    startQuizSession,
    recordQuizAnswer,
    advanceQuizQuestion,
  } = useCompetition();

  // Guard: Check round status for this team
  const roundStatus = getTeamRoundStatus('quiz', currentTeam.id);
  const isLocked = roundStatus === 'LOCKED' || roundStatus === 'ELIMINATED';

  // Check if there is an existing session
  const [session, setSession] = useState<TeamQuizSession>(() => {
    return getQuizSession(currentTeam.id);
  });

  // Start the session timer only when contest mode is ready
  const handleContestReady = useCallback(() => {
    const existing = getQuizSession(currentTeam.id);
    if (!existing.startedAt || existing.questions.length === 0) {
      const fresh = startQuizSession(currentTeam.id);
      setSession(fresh);
    } else {
      setSession(existing);
    }
  }, [currentTeam.id, getQuizSession, startQuizSession]);

  // Authoritative question timer calculation
  // remaining = 30 seconds - elapsed time from stored questionStartedAt
  const computeSecondsRemaining = useCallback(
    (questionStartedAt: number) => {
      if (!questionStartedAt) return quizSettings.timePerQuestionSeconds;
      const elapsedSeconds = Math.floor((Date.now() - questionStartedAt) / 1000);
      return Math.max(0, quizSettings.timePerQuestionSeconds - elapsedSeconds);
    },
    [quizSettings.timePerQuestionSeconds]
  );

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    return computeSecondsRemaining(session?.questionStartedAt || 0);
  });

  // Track user's choice for the active question
  const currentQ = session?.questions?.[session?.currentQuestionIndex];
  const [selectedOption, setSelectedOption] = useState<number | undefined>(() => {
    return currentQ ? session.answers[currentQ.id] : undefined;
  });

  // Update selected option when moving questions or reloading
  useEffect(() => {
    if (currentQ) {
      setSelectedOption(session.answers[currentQ.id]);
    }
  }, [session?.currentQuestionIndex, currentQ, session?.answers]);

  // Handle auto-advance when timer expires
  const handleAutoAdvance = useCallback(() => {
    if (!session || session.isFinished) return;
    const updated = advanceQuizQuestion(selectedOption);
    setSession(updated);
    setSecondsRemaining(computeSecondsRemaining(updated.questionStartedAt));
  }, [advanceQuizQuestion, selectedOption, computeSecondsRemaining, session]);

  // Main countdown timer interval
  useEffect(() => {
    if (!session || !session.startedAt || session.isFinished || isLocked) return;

    const interval = setInterval(() => {
      const remaining = computeSecondsRemaining(session.questionStartedAt);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        handleAutoAdvance();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [session, isLocked, computeSecondsRemaining, handleAutoAdvance]);

  // Option selection
  const handleOptionSelect = (optIndex: number) => {
    if (!currentQ || session.isFinished) return;
    setSelectedOption(optIndex);
    recordQuizAnswer(currentQ.id, optIndex);
  };

  // Explicit NEXT button click
  const handleNextClick = () => {
    const updated = advanceQuizQuestion(selectedOption);
    setSession(updated);
    setSecondsRemaining(computeSecondsRemaining(updated.questionStartedAt));
  };

  if (isLocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            Round 1 is Locked
          </h2>
          <p className="text-sm text-neutral-500 mb-6">
            The organizer has not opened this round yet or your team is not eligible.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold text-xs cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const optionLabels = ['A', 'B', 'C', 'D'];
  const isLastQuestion = session?.questions && session.currentQuestionIndex === session.questions.length - 1;

  return (
    <ContestModeGuard
      roundKey="quiz"
      roundTitle="Round 1: MindSprint Quiz"
      roundDuration="12m 30s"
      onExit={() => onNavigate('dashboard')}
      isCompleted={session?.isFinished}
      onContestReady={handleContestReady}
    >
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header: Event, Round, Team, Question Counter & Timer */}
        <div className="bg-white border border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Déjà vu • MindSprint
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  {currentTeam.name || currentTeam.id}
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white font-mono">
                Question {(session?.currentQuestionIndex ?? 0) + 1} / {session?.questions?.length || 25}
              </div>
            </div>

            {/* 30-Second Question Timer */}
            <div
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
                secondsRemaining <= 10
                  ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/60 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                  : 'bg-neutral-50 border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-mono text-base font-bold">
                00:{String(secondsRemaining).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Question and Options */}
        {currentQ && (
          <div className="bg-white border border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 mb-6 shadow-sm">
            <div className="mb-6">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">
                Question {session.currentQuestionIndex + 1} (2 Points)
              </span>
              <h3 className="text-lg sm:text-xl font-semibold text-neutral-950 dark:text-white leading-relaxed">
                {currentQ.question}
              </h3>
            </div>

            {/* 4 Options (A, B, C, D) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt, optIndex) => {
                const isSelected = selectedOption === optIndex;
                return (
                  <button
                    key={optIndex}
                    type="button"
                    onClick={() => handleOptionSelect(optIndex)}
                    className={`p-4 rounded-xl text-left border flex items-start gap-3 transition cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 text-neutral-950 dark:bg-amber-950/40 dark:border-amber-400 dark:text-white ring-1 ring-amber-400'
                        : 'border-neutral-200 bg-neutral-50/60 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                        isSelected
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {optionLabels[optIndex]}
                    </span>
                    <span className="text-sm font-normal pt-0.5 leading-snug">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom: ONLY [ NEXT ] */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleNextClick}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-sm font-bold transition shadow-sm cursor-pointer"
          >
            <span>{isLastQuestion ? 'FINISH QUIZ' : 'NEXT'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center mt-6 text-xs text-neutral-400">
          One-way quiz flow. Once you advance or the 30-second timer elapses, your response is saved and locked.
        </div>
      </div>
    </ContestModeGuard>
  );
};
