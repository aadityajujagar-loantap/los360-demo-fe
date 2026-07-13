"use client";

import React from "react";
import { sanitizeMobileNumber } from "@/app/_lib/validation/mobile";
import { useScrollToFieldError } from "@/app/_hooks/useScrollToFieldError";

const ERR_ICON = (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
    <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.75 2.75a.75.75 0 011.5 0v2.5a.75.75 0 01-1.5 0v-2.5zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
  </svg>
);

/**
 * FormInput — Premium input, orange focus ring, blue prefix accent.
 */
export function FormInput({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  value,
  onChange,
  error,
  readOnly = false,
  prefix,
  suffix,
  className = "",
  inputStyle,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
  error?: string;
  readOnly?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
  inputStyle?: React.CSSProperties;
  autoComplete?: string;
}) {
  const isMobileField =
    name === "mobile" || /^co_\d+_phone$/.test(name) || /mobile/i.test(label);
  const fieldRef = useScrollToFieldError<HTMLDivElement>(error);

  return (
    <div
      ref={fieldRef}
      data-field-error={error ? "true" : undefined}
      data-field-name={name}
      className={`scroll-mt-24 flex flex-col gap-2 ${className}`}
    >
      <label className="text-[12px] font-bold text-gray-500 tracking-wider uppercase">
        {label}
        {required && (
          <span className="text-[var(--primary,#2e3192)] ml-1">*</span>
        )}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          name={name}
          autoComplete={autoComplete ?? (type === "password" ? "new-password" : "off")}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
          value={value ?? ""}
          onChange={(e) => {
            let val = e.target.value;
            if (name === "email" || type === "email") {
              // Allow standard email characters.
              val = val.replace(/[^a-zA-Z0-9@._%+\-]/g, "");
            } else if (isMobileField) {
              val = sanitizeMobileNumber(val);
            } else if (type === "date") {
              // Native date inputs emit YYYY-MM-DD; keep the hyphens intact.
              val = e.target.value;
            } else if (type === "tel") {
              val = val.replace(/\D/g, "");
            } else if (type === "number") {
              // Only digits
              val = val.replace(/\D/g, "");
            } else {
              // Default: only alphanumeric, spaces, commas, and hyphens.
              val = val.replace(/[^a-zA-Z0-9 ,\-]/g, "");
            }
            onChange?.(val);
          }}
          onKeyDown={(e) => {
            if (type === "number" && (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+")) {
              e.preventDefault();
            }
          }}
          min={type === "number" ? "0" : undefined}
          readOnly={readOnly}
          style={inputStyle}
          className={`
            w-full py-3 rounded-xl border text-sm font-medium text-gray-800
            outline-none transition-all duration-200
            placeholder:text-gray-300 placeholder:font-normal
            ${prefix ? "pl-11 pr-4" : "px-4"}
            ${suffix ? "pr-11" : ""}
            ${
              readOnly
                ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
                : error
                  ? "bg-white border-red-400 ring-4 ring-red-50"
                  : "bg-white border-gray-200 hover:border-gray-300 focus:border-[var(--primary,#2e3192)] focus:ring-4 focus:ring-[var(--primary,#2e3192)]/10"
            }
          `}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-red-500 text-[11px] font-medium">
          {ERR_ICON}
          {error}
        </p>
      )}
    </div>
  );
}
import Select from "../ui/Select";

/**
 * FormSelect — Premium Custom Dropdown.
 */
export function FormSelect({
  label,
  name,
  options,
  required = false,
  value,
  onChange,
  error,
  className = "",
  placeholder,
  disabled = false,
  onOpen,
}: {
  label: string;
  name: string;
  options: { label: string; value: string }[];
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
  error?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onOpen?: () => void;
}) {
  return (
    <Select
      label={label}
      name={name}
      options={options}
      required={required}
      value={value}
      onChange={onChange}
      error={error}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      onOpen={onOpen}
    />
  );
}



/**
 * SectionHeader — Blue accent bar (matches Cosmos blue from reference image).
 */
export function SectionHeader({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-[var(--primary,#2e3192)]" />
        <h3 className="text-base font-black text-gray-900 tracking-tight">{title}</h3>
      </div>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1 ml-4">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * SectionDivider
 */
export function SectionDivider({ className = "" }: { className?: string }) {
  return <div className={`my-6 border-t border-gray-100 ${className}`} />;
}

/**
 * ToggleSwitch — Blue toggle (matches reference image: Cosmos blue #2e3192 when active).
 */
export function ToggleSwitch({
  labelOff = "No",
  labelOn = "Yes",
  value,
  onChange,
  error,
}: {
  labelOff?: string;
  labelOn?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        {labelOff && (
          <span
            className={`text-sm font-semibold transition-colors ${!value ? "text-gray-800" : "text-gray-400"}`}
          >
            {labelOff}
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary,#2e3192)]/30 ${
            error ? "ring-2 ring-red-500" : ""
          }`}
          style={{
            backgroundColor: value ? "var(--primary, #9a3f91)" : "#d1d5db",
          }}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
              value ? "left-6" : "left-1"
            }`}
          />
        </button>
        {labelOn && (
          <span
            className={`text-sm font-semibold transition-colors ${value ? "text-gray-800" : "text-gray-400"}`}
          >
            {labelOn}
          </span>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-[11px] font-medium flex items-center gap-1">
          {ERR_ICON}
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * PrimaryButton — Orange CTA button (exactly as in reference image).
 */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  isLoading = false,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        w-full py-3 rounded-lg font-bold text-sm text-white
        transition-all duration-150 shadow-md
        hover:brightness-105 hover:shadow-lg
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-[var(--primary,#9a3f91)]/40 focus:ring-offset-2
        ${className}
      `}
      style={{
        backgroundColor: "var(--primary, #9a3f91)",
        boxShadow: "0 3px 12px rgba(154,63,145,0.25)",
      }}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Processing…
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * SecondaryButton — Outlined variant.
 */
export function SecondaryButton({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full py-3 rounded-lg font-semibold text-sm border-2
        border-[var(--accent,#623f99)] text-[var(--accent,#623f99)]
        hover:bg-[var(--accent-light,#eef0ff)] transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-[var(--accent,#2e3192)]/30
        ${className}
      `}
    >
      {children}
    </button>
  );
}
