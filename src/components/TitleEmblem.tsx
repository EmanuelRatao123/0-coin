export function TitleEmblem() {
  return (
    <div className="select-none pointer-events-none">
      <svg
        viewBox="0 0 420 96"
        className="w-72 sm:w-96 h-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
        role="img"
        aria-label="Zero Coin Run 3D"
      >
        <defs>
          <linearGradient id="zcrGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {/* Crossed-out Coin Emblem */}
        <g transform="translate(8, 14)">
          <circle cx="34" cy="34" r="30" fill="#0f172a" stroke="url(#zcrGold)" strokeWidth="4" />
          <circle cx="34" cy="34" r="20" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
          <path d="M34 20 L38 30 L48 34 L38 38 L34 48 L30 38 L20 34 L30 30 Z" fill="#fbbf24" />
          <line x1="12" y1="56" x2="56" y2="12" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
        </g>

        {/* Wordmark */}
        <text
          x="88"
          y="46"
          fill="#f8fafc"
          fontFamily="'Chakra Petch', sans-serif"
          fontWeight="700"
          fontSize="36"
          letterSpacing="1.5"
        >
          ZERO COIN
        </text>
        <text
          x="90"
          y="78"
          fill="#fbbf24"
          fontFamily="'Chakra Petch', sans-serif"
          fontWeight="700"
          fontSize="24"
          letterSpacing="5"
        >
          RUN 3D
        </text>
      </svg>
    </div>
  );
}

export function CoinHazardIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#78350f" stroke="#fbbf24" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" fill="#f59e0b" />
      <line x1="5" y1="19" x2="19" y2="5" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function ShopCoinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#b45309" stroke="#fde047" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" fill="#fef08a" />
    </svg>
  );
}
