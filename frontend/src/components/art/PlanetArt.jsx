import { useId } from "react";

function Sparkle({ x, y, size, className = "" }) {
  const s = size;
  return (
    <path
      className={className}
      d={`M ${x} ${y - s} C ${x + s * 0.12} ${y - s * 0.12} ${x + s * 0.12} ${y - s * 0.12} ${x + s} ${y} C ${x + s * 0.12} ${y + s * 0.12} ${x + s * 0.12} ${y + s * 0.12} ${x} ${y + s} C ${x - s * 0.12} ${y + s * 0.12} ${x - s * 0.12} ${y + s * 0.12} ${x - s} ${y} C ${x - s * 0.12} ${y - s * 0.12} ${x - s * 0.12} ${y - s * 0.12} ${x} ${y - s} Z`}
    />
  );
}

/** Ringed planet with a small moon — the student theme's mascot object. */
export default function PlanetArt({ className = "" }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg viewBox="0 0 260 240" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-body`} cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#FFF6FA" />
          <stop offset="38%" stopColor="#F8C2D7" />
          <stop offset="78%" stopColor="#D9578F" />
          <stop offset="100%" stopColor="#7E1A4C" />
        </radialGradient>
        <linearGradient id={`${id}-ring`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#7E1A4C" />
          <stop offset="45%" stopColor="#FFEAF3" />
          <stop offset="100%" stopColor="#C23F7A" />
        </linearGradient>
        <radialGradient id={`${id}-moon`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#9FE0D6" />
          <stop offset="100%" stopColor="#1F8080" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="130" cy="120" r="70" />
        </clipPath>
      </defs>

      <g fill="#FFFFFF">
        <Sparkle x={34} y={42} size={9} />
        <Sparkle x={226} y={196} size={7} />
        <Sparkle x={214} y={30} size={5} />
        <circle cx="58" cy="200" r="2.5" />
        <circle cx="244" cy="96" r="2" />
      </g>

      <g transform="rotate(-16 130 120)">
        {/* back half of the ring, behind the planet */}
        <path
          d="M 16 120 A 114 28 0 0 1 244 120"
          fill="none"
          stroke={`url(#${id}-ring)`}
          strokeWidth="11"
          strokeLinecap="round"
          opacity="0.75"
        />
      </g>

      <circle cx="130" cy="120" r="70" fill={`url(#${id}-body)`} />
      <g clipPath={`url(#${id}-clip)`} fill="none" stroke="#7E1A4C" strokeOpacity="0.14" strokeWidth="9">
        <path d="M 52 96 Q 130 80 208 104" />
        <path d="M 54 146 Q 130 130 210 152" />
      </g>
      <ellipse cx="104" cy="88" rx="20" ry="11" fill="#FFFFFF" opacity="0.55" transform="rotate(-30 104 88)" />

      <g transform="rotate(-16 130 120)">
        {/* front half of the ring, over the planet */}
        <path
          d="M 16 120 A 114 28 0 0 0 244 120"
          fill="none"
          stroke={`url(#${id}-ring)`}
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M 30 122 A 100 22 0 0 0 230 122"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
      </g>

      <circle cx="222" cy="58" r="15" fill={`url(#${id}-moon)`} />
      <circle cx="217" cy="62" r="3" fill="#1F8080" opacity="0.5" />
    </svg>
  );
}
