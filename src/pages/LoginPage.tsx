import React, { useState } from 'react';
import { useCompetition } from '../context/CompetitionContext';
import { IsteLogo } from '../components/IsteLogo';
import { Users, Shield, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { loginTeam, loginAdmin } = useCompetition();

  const [activeTab, setActiveTab] = useState<'contestant' | 'admin'>('contestant');

  // Contestant Form
  const [teamId, setTeamId] = useState('');
  const [teamPass, setTeamPass] = useState('');
  const [teamError, setTeamError] = useState('');

  // Admin Form
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleContestantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError('');
    if (!teamId.trim()) {
      setTeamError('Please enter your assigned Team ID (e.g., CT2026 or T01).');
      return;
    }
    if (!teamPass.trim()) {
      setTeamError('Please enter your team password.');
      return;
    }

    const res = loginTeam(teamId, teamPass);
    if (res.success) {
      onNavigate('dashboard');
    } else {
      setTeamError(res.message);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (!adminPass.trim()) {
      setAdminError('Please enter admin credentials.');
      return;
    }

    const success = await loginAdmin(adminPass);
    if (success) {
      onNavigate('admin');
    } else {
      setAdminError('Invalid admin passcode. Access denied.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* ISTE Insignia Header */}
        <div className="text-center mb-6">
          <a
            href="https://www.iste.griet.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            title="ISTE GRIET Official Portal"
            className="inline-block hover:opacity-85 transition"
          >
            <IsteLogo className="w-12 h-12 mx-auto" />
          </a>
          <h2 className="text-2xl font-black tracking-tight text-neutral-950 dark:text-white mt-2 font-serif">
            DÉJÀ VU
          </h2>
          <p className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
            Technical Event Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-neutral-200 dark:bg-neutral-900/80 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors duration-200">
          {/* Tab Selector: Contestant vs Admin */}
          <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-950 p-1 mb-6 border border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('contestant');
                setTeamError('');
                setAdminError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'contestant'
                  ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contestant Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setTeamError('');
                setAdminError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </button>
          </div>

          {/* Contestant Login Form */}
          {activeTab === 'contestant' ? (
            <form onSubmit={handleContestantSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Team ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. CT2026 or T01"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                  className="w-full bg-neutral-50 border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 transition"
                  autoComplete="username"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Assigned Team ID (e.g. CT2026, T01)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter assigned password"
                  value={teamPass}
                  onChange={(e) => setTeamPass(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 transition"
                  autoComplete="current-password"
                />
              </div>

              {teamError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{teamError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-xs text-neutral-400">
                Official accounts are issued by the event organizers.
              </div>
            </form>
          ) : (
            /* Admin Login Form */
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Admin Passcode
                </label>
                <input
                  type="password"
                  placeholder="Enter organizer passcode"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 transition"
                  autoComplete="current-password"
                />
              </div>

              {adminError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Shield className="w-4 h-4" />
                <span>Enter Admin Panel</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
