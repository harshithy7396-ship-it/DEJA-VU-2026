import React from 'react';
import { useCompetition } from '../context/CompetitionContext';
import { IsteLogo } from './IsteLogo';
import { LogIn, LogOut, Sun, Moon, Shield } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { currentTeam, isTeamLoggedIn, logoutTeam, isAdmin, theme, toggleTheme } = useCompetition();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950/90 dark:text-neutral-100 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: ISTE Logo + Event Wordmark */}
        <div className="flex items-center gap-3">
          <a
            href="https://www.iste.griet.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            title="ISTE GRIET Official Portal"
            className="hover:opacity-85 transition shrink-0"
          >
            <IsteLogo className="w-8 h-8" />
          </a>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

          <button
            onClick={() => onNavigate('landing')}
            className="text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-neutral-950 dark:text-white group-hover:text-amber-500 transition font-serif">
                DÉJÀ VU
              </span>
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 hidden sm:inline uppercase tracking-wider">
                Technical Event
              </span>
            </div>
          </button>
        </div>

        {/* Right: Participant Navigation + Theme Toggle */}
        <div className="flex items-center gap-3 sm:gap-5 text-xs font-semibold">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition cursor-pointer ${
              currentPage === 'landing'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`transition cursor-pointer ${
              currentPage === 'dashboard'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Rounds
          </button>

          <button
            onClick={() => onNavigate('leaderboard')}
            className={`transition cursor-pointer ${
              currentPage === 'leaderboard'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            Leaderboard
          </button>

          {/* Theme Toggle Button: ☀ Light / 🌙 Dark */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-200 text-xs font-medium transition cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-neutral-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Admin badge / access button */}
          <button
            onClick={() => onNavigate('admin')}
            title="Admin Control Center"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              isAdmin
                ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAdmin ? 'Admin' : 'Admin'}</span>
          </button>

          {/* Contestant Login / Logout */}
          <div className="pl-1 sm:pl-2 border-l border-neutral-200 dark:border-neutral-800">
            {isTeamLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="hidden md:inline-block px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-300 text-xs font-bold"
                >
                  {currentTeam.name || currentTeam.id}
                </button>
                <button
                  onClick={() => {
                    logoutTeam();
                    onNavigate('login');
                  }}
                  title="Logout Team"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 dark:border-neutral-800 dark:hover:bg-neutral-900 dark:text-neutral-300 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 font-bold transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
