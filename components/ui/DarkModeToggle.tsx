'use client';

import { useTheme } from '@/components/providers/ThemeProvider';

interface DarkModeToggleProps {
  showLabel?: boolean;
}

export default function DarkModeToggle({ showLabel = false }: DarkModeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <label className="inline-flex items-center cursor-pointer">
      <div className="neu-toggle" onClick={toggleTheme}>
        <input
          type="checkbox"
          className="neu-toggle-input"
          checked={isDark}
          onChange={toggleTheme}
        />
        <div className="neu-toggle-indicator">
          {/* Sun icon on light side */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          </div>
          {/* Moon icon on dark side */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-neon-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </div>
        </div>
      </div>
      {showLabel && (
        <span className="ml-3 text-sm font-medium text-dark-600 dark:text-silver-400">
          {isDark ? 'Mode sombre' : 'Mode clair'}
        </span>
      )}
    </label>
  );
}
