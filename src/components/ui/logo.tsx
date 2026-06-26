"use client";
import { classMap } from '@/styles/classMap';
import { useTranslation } from "@/lib/i18n";

import { cn } from "@/lib/utils";

/* ─── Public Logo component ─── */
interface LogoProps {
  /** Tailwind classes applied to the root wrapper */
  className?: string;
  /** Size of the logo image mark in pixels (default 36) */
  markSize?: number;
  /** Tailwind classes for the text part */
  textClassName?: string;
  /** If true, only renders the image mark (no text) */
  iconOnly?: boolean;
  /** If provided, the whole logo acts as a button */
  onClick?: () => void;
  /** If true, disables automatic mobile responsiveness (use fixed sizes) */
  disableMobileResponsive?: boolean;
}

export function Logo({
  className,
  markSize = 36,
  textClassName,
  iconOnly = false,
  onClick,
  disableMobileResponsive = false,
}: LogoProps) {
  // Apply mobile responsive classes by default
  const mobileResponsiveClass = disableMobileResponsive
    ? ""
    : "sm:scale-100 scale-[0.85] origin-left";
  
  const wrapperClassName = cn(
    iconOnly ? "inline-flex items-center justify-center" : "flex items-center gap-2 sm:gap-2.5",
    mobileResponsiveClass,
    className
  );

  const svgClassName = cn(
    "shrink-0"
  );
  const { t } = useTranslation();

  // Adjust text size for mobile
  const defaultTextClass = "text-lg font-semibold tracking-[0.06em] select-none flex items-baseline gap-0.5 sm:text-base";
  
  const inner = (
    <>
      {/* Premium AI-Inspired Logo Mark */}
      <svg
        width={markSize}
        height={markSize}
        viewBox={t("auto.k_0_0_48_48_170")}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={svgClassName}
      >
        <defs>
          {/* Primary gradient - Sky to Amber */}
          <linearGradient id="primary-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Outer glow */}
          <filter id="outer-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background subtle hexagon */}
        <path
          d={t("auto.k_m24_2_l44_13_l44_35_l24_46_l4_35_l4_13_z_171")}
          fill="url(#primary-gradient)"
          opacity="0.06"
        />

        {/* Outer ring - Neural network inspired */}
        <path
          d={t("auto.k_m24_5_l41_14_5_l41_33_5_l24_43_l7_33_5_l_172")}
          stroke="url(#primary-gradient)"
          strokeWidth="1.2"
          fill="none"
          filter="url(#glow)"
          className="animate-[spin_20s_linear_infinite]"
          style={{ transformOrigin: "24px 24px" }}
        />

        {/* Inner hexagon */}
        <path
          d={t("auto.k_m24_10_l36_17_l36_31_l24_38_l12_31_l12_1_173")}
          stroke="url(#primary-gradient)"
          strokeWidth="1.5"
          fill="none"
          filter="url(#glow)"
          className="animate-[spin_15s_linear_infinite_reverse]"
          style={{ transformOrigin: "24px 24px" }}
        />

        {/* Neural network nodes */}
        <circle cx="24" cy="10" r="2" fill="url(#primary-gradient)" filter="url(#glow)" />
        <circle cx="36" cy="17" r="2" fill="url(#primary-gradient)" filter="url(#glow)" />
        <circle cx="36" cy="31" r="2" fill="url(#primary-gradient)" filter="url(#glow)" />
        <circle cx="24" cy="38" r="2" fill="url(#primary-gradient)" filter="url(#glow)" />
        <circle cx="12" cy="31" r="2" fill="url(#primary-gradient)" filter="url(#glow)" />
        <circle cx="12" cy="17" r="2" fill="url(#primary-gradient)" filter="url(#glow)" />

        {/* Connection lines - neural pathways */}
        <path
          d={t("auto.k_m24_12_l24_36_m14_18_l34_30_m34_18_l14_3_174")}
          stroke="url(#primary-gradient)"
          strokeWidth="0.8"
          opacity="0.5"
        />

        {/* Center core - AI brain */}
        <circle cx="24" cy="24" r="8" fill="url(#primary-gradient)" opacity="0.12" />
        <circle cx="24" cy="24" r="5" fill="url(#primary-gradient)" opacity="0.2" filter="url(#glow)" />
        <circle cx="24" cy="24" r="3" fill="url(#primary-gradient)" filter="url(#glow)" className="animate-pulse" />

        {/* Orbiting electrons */}
        <circle cx="24" cy="16" r="1.5" fill="#38bdf8" filter="url(#glow)">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={t("auto.k_0_24_24_175")}
            to={t("auto.k_360_24_24_176")}
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="32" cy="24" r="1.5" fill="#f59e0b" filter="url(#glow)">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={t("auto.k_120_24_24_177")}
            to={t("auto.k_480_24_24_178")}
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="20" cy="31" r="1.5" fill="#7c3aed" filter="url(#glow)">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={t("auto.k_240_24_24_179")}
            to={t("auto.k_600_24_24_180")}
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {!iconOnly && (
        <span
          className={cn(
            "text-lg font-semibold tracking-[0.06em] select-none flex items-baseline gap-0.5 sm:text-base",
            textClassName
          )}
        >
          <span className={classMap["k_bg_gradient_to_r_from_slate_700_to_slate_181"]}>
            Unify
          </span>
          <span className={classMap["k_bg_gradient_to_r_from_sky_500_via_violet_182"]}>
            Focus
          </span>
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          wrapperClassName,
          "transition-all duration-300 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-sky-500/50 rounded-lg px-1 py-0.5"
        )}
        aria-label={t("auto.k_unifyfocus_retour_l_accueil_183")}
      >
        {inner}
      </button>
    );
  }

  return <div className={wrapperClassName}>{inner}</div>;
}

export default Logo;