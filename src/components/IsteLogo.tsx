import React from 'react';

interface IsteLogoProps {
  className?: string;
  size?: number;
}

export const IsteLogo: React.FC<IsteLogoProps> = ({ className = 'h-8 w-8', size }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ISTE Logo"
    >
      {/* Outer Gear Ring representing Technical Education */}
      <circle cx="50" cy="50" r="46" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 2" opacity="0.9" />
      <circle cx="50" cy="50" r="41" fill="#0f172a" stroke="#d97706" strokeWidth="2" />
      
      {/* Inner Central Cog & Flame of Knowledge */}
      <circle cx="50" cy="50" r="28" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
      
      {/* Flame Motif */}
      <path
        d="M50 26 C46 36, 41 42, 45 49 C48 54, 53 54, 55 49 C59 42, 54 36, 50 26 Z"
        fill="#f59e0b"
      />
      <path
        d="M50 34 C48 40, 45 44, 47 48 C49 51, 52 51, 53 48 C55 44, 52 40, 50 34 Z"
        fill="#fef3c7"
      />
      
      {/* Gear Base */}
      <rect x="42" y="52" width="16" height="4" rx="2" fill="#f59e0b" />
      <rect x="45" y="57" width="10" height="3" rx="1.5" fill="#f59e0b" />
      
      {/* Text ISTE */}
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="10"
        fontWeight="900"
        fontFamily="sans-serif"
        letterSpacing="1.5"
      >
        ISTE
      </text>
      <text
        x="50"
        y="80"
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="5"
        fontWeight="700"
        fontFamily="sans-serif"
        letterSpacing="0.8"
      >
        GRIET
      </text>
    </svg>
  );
};
