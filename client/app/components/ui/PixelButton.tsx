"use client";

import Link from "next/link";
import React from "react";

interface PixelButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  href?: string;
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export default function PixelButton({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  className = "",
  icon,
}: PixelButtonProps) {
  // Core structural classes: pixel font, uppercase, flex centering, small radius for slightly blocky corners, and the active "press" translation.
  const baseStyles =
    "relative inline-flex items-center justify-center gap-2 font-pixel uppercase tracking-wider rounded-[4px] transition-all duration-150 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none cursor-pointer select-none";

  const variants = {
    primary:
      // Fill: Stellar Strawberry. Border/Shadow: Pico Eggplant. Text: Siesta Tan.
      // Inner highlight (bevel): rgba(255, 255, 255, 0.3)
      "bg-stellar-strawberry text-siesta-tan border-[3px] border-pico-eggplant shadow-[4px_4px_0_var(--color-pico-eggplant)] hover:brightness-110 shadow-[inset_0_3px_0_rgba(255,255,255,0.3)]",
    secondary:
      // Fill: Blue Whale. Border/Shadow: Hei Se Black. Outline: Grayzone.
      // Inner highlight (bevel): rgba(255, 255, 255, 0.1)
      "bg-blue-whale text-siesta-tan border-[3px] border-grayzone shadow-[4px_4px_0_var(--color-hei-se)] hover:brightness-110 shadow-[inset_0_3px_0_rgba(255,255,255,0.1)]",
  };

  const sizes = {
    sm: "px-4 py-2 text-[10px]",
    md: "px-6 py-3 text-xs",
    lg: "px-8 py-4 text-sm",
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  const content = (
    <>
      {children}
      {icon && <span className="inline-flex">{icon}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
