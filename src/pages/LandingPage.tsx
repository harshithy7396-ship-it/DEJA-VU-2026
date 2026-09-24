import React from 'react';
import { IsteLogo } from '../components/IsteLogo';
import { Calendar, Clock, LogIn, Trophy, ExternalLink } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* ISTE GRIET Small Professional Logo */}
        <div className="flex flex-col items-center justify-center gap-2">
          <a
            href="https://www.iste.griet.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            title="ISTE GRIET Official Portal"
            className="hover:opacity-85 transition inline-block"
          >
            <IsteLogo className="w-14 h-14 mx-auto" />
          </a>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            ISTE GRIET Student Chapter
          </span>
        </div>

        {/* Event Title */}
        <div className="space-y-2">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-neutral-950 dark:text-white font-serif">
            DÉJÀ VU
          </h1>
          <p className="text-xl sm:text-2xl font-semibold uppercase tracking-widest text-neutral-700 dark:text-neutral-300">
            Technical Event
          </p>
        </div>

        {/* Date and Time */}
        <div className="inline-flex flex-wrap items-center justify-center gap-6 py-3 px-6 rounded-2xl bg-white border border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>1 October 2026</span>
          </div>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>10:00 AM – 1:00 PM</span>
          </div>
        </div>

        {/* Exactly 3 Buttons: [ LOGIN ] [ LEADERBOARD ] [ ISTE GRIET ] */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('login')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>LOGIN</span>
          </button>

          <button
            onClick={() => onNavigate('leaderboard')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-200 font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>LEADERBOARD</span>
          </button>

          <a
            href="https://www.iste.griet.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            <span>ISTE GRIET</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
