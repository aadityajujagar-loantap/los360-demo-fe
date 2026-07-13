"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    // Matching .btnPrimary from dashboard.module.css
    primary:
      "bg-[var(--btn-primary,#6366f1)] text-white hover:opacity-90 focus:ring-offset-1 shadow-sm",
    secondary:
      "bg-[#eef2ff] text-[#4338ca] hover:bg-[#e0e7ff] focus:ring-[#c7d2fe]",
    outline:
      "bg-white text-[#334155] border border-[#cbd5e1] hover:bg-[#f8fafc] hover:border-[#6366f1] focus:ring-[#f1f5f9]",
    ghost:
      "bg-transparent text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#334155]",
    danger: "bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm", // Dashboard standard
    lg: "px-8 py-4 text-base", // For main journey CTAs
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
}
