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
      {/* App Logo */}
      <img
        src="/logo.svg"
        alt="UnifyFocus Logo"
        width={markSize}
        height={markSize}
        className={cn("shrink-0", svgClassName)}
      />

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