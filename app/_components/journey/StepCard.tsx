"use client";

import React from "react";

/**
 * StepCard — Clean white card container for each journey step.
 * Matches the reference: white surface, subtle border, gentle shadow.
 */
interface StepCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  /** When true, no header padding/border is rendered */
  noHeader?: boolean;
}

export default function StepCard({
  title,
  subtitle,
  children,
  className = "",
  icon,
  noHeader = false,
}: StepCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm animate-fade-slide-up ${className}`}
    >
      {!noHeader && (title || subtitle) && (
        <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {icon && (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  backgroundColor: "var(--primary-light, #fcf5fb)",
                  color: "var(--primary, #9a3f91)",
                }}
              >
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h2 className="text-[1.1rem] font-bold text-gray-900 leading-snug">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="overflow-visible px-4 py-4 sm:px-6 sm:py-5">{children}</div>
    </div>
  );
}
