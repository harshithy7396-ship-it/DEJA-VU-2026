import React from 'react';
import { IsteLogo } from './IsteLogo';
import { ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-200 bg-white dark:border-neutral-900 dark:bg-neutral-950 py-8 text-xs text-neutral-500 dark:text-neutral-400 transition-colors duration-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <a
              href="https://www.iste.griet.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-85 transition group"
            >
              <IsteLogo className="w-6 h-6 shrink-0" />
              <span className="font-semibold text-neutral-700 group-hover:text-amber-600 dark:text-neutral-300 dark:group-hover:text-amber-400 transition">
                ISTE GRIET Student Chapter
              </span>
            </a>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span>Déjà vu – Technical Event</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-neutral-500 dark:text-neutral-400">
            <span>1 October 2026</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span>10:00 AM – 1:00 PM</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <a
              href="https://www.iste.griet.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:underline dark:text-amber-400 inline-flex items-center gap-1 transition font-medium"
            >
              <span>iste.griet.ac.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
