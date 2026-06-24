"use client";

import { cn } from "@/lib/utils";

/**
 * LogoMark - Icon-only version of the UnifyFocus logo
 * Used for compact spaces like loading animations, favicons, etc.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        {/* Primary gradient - Sky to Amber */}
        <linearGradient id="mark-primary-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="mark-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background subtle hexagon */}
      <path
        d="M24 2L44 13L44 35L24 46L4 35L4 13Z"
        fill="url(#mark-primary-gradient)"
        opacity="0.06"
      />

      {/* Outer ring - Neural network inspired */}
      <path
        d="M24 5L41 14.5L41 33.5L24 43L7 33.5L7 14.5Z"
        stroke="url(#mark-primary-gradient)"
        strokeWidth="1.2"
        fill="none"
        filter="url(#mark-glow)"
      />

      {/* Inner hexagon */}
      <path
        d="M24 10L36 17L36 31L24 38L12 31L12 17Z"
        stroke="url(#mark-primary-gradient)"
        strokeWidth="1.5"
        fill="none"
        filter="url(#mark-glow)"
      />

      {/* Neural network nodes */}
      <circle cx="24" cy="10" r="2" fill="url(#mark-primary-gradient)" filter="url(#mark-glow)" />
      <circle cx="36" cy="17" r="2" fill="url(#mark-primary-gradient)" filter="url(#mark-glow)" />
      <circle cx="36" cy="31" r="2" fill="url(#mark-primary-gradient)" filter="url(#mark-glow)" />
      <circle cx="24" cy="38" r="2" fill="url(#mark-primary-gradient)" filter="url(#mark-glow)" />
      <circle cx="12" cy="31" r="2" fill="url(#mark-primary-gradient)" filter="url(#mark-glow)" />
      <circle cx="12" cy="17" r="2" fill="url(#mark-primary-gradient)" filter="url(#mark-glow)" />

      {/* Connection lines - neural pathways */}
      <path
        d="M24 12L24 36M14 18L34 30M34 18L14 30"
        stroke="url(#mark-primary-gradient)"
        strokeWidth="0.8"
        opacity="0.5"
      />

      {/* Center core - AI brain */}
      <circle cx="24" cy="24" r="8" fill="url(#mark-primary-gradient)" opacity="0.12" />
      <circle cx="24" cy="24" r="5" fill="url(#mark-primary-gradient)" opacity="0.2" filter="url(#mark-glow)" />
      <circle cx="24" cy="24" r="3" fill="url(#mark-primary-gradient)" filter="url(#mark-glow)" />

      {/* Orbiting electrons */}
      <circle cx="24" cy="16" r="1.5" fill="#38bdf8" filter="url(#mark-glow)" />
      <circle cx="32" cy="24" r="1.5" fill="#f59e0b" filter="url(#mark-glow)" />
      <circle cx="20" cy="31" r="1.5" fill="#7c3aed" filter="url(#mark-glow)" />
    </svg>
  );
}

export default LogoMark;