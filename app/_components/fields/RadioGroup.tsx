"use client";

import { useScrollToFieldError } from "@/app/_hooks/useScrollToFieldError";
import { FieldConfig } from "../../_types/journey";

interface RadioGroupProps extends FieldConfig {
  value: string;
  onChange: (value: string) => void;
  variant?: "standard" | "button-group" | "toggle";
  error?: string;
}

/**
 * RadioGroup — Three display variants: standard card-style, pill button-group, and Yes/No toggle.
 * All variants use CSS var tokens for theming.
 */
export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  variant = "standard",
  required,
  error,
}: RadioGroupProps) {
  const fieldRef = useScrollToFieldError<HTMLDivElement>(error);

  if (!options) return null;

  return (
    <div
      ref={fieldRef}
      data-field-error={error ? "true" : undefined}
      data-field-name={name}
      className="scroll-mt-24 flex flex-col gap-2.5"
    >
      {label && (
        <label className="text-[12.5px] font-semibold text-slate-600 tracking-wide uppercase">
          {label}{" "}
          {required && <span className="text-[var(--primary,#2e3192)]">*</span>}
        </label>
      )}

      {/* ── Toggle variant: No / toggle / Yes ── */}
      {variant === "toggle" ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-semibold transition-colors ${value === "no" ? "text-slate-900" : "text-slate-400"}`}
            >
              No
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={value === "yes"}
              onClick={() => onChange(value === "yes" ? "no" : "yes")}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary,#2e3192)]/30 ${
                error ? "ring-2 ring-red-500" : ""
              }`}
              style={{
                backgroundColor:
                  value === "yes" ? "var(--primary, #2e3192)" : "#cbd5e1",
              }}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${
                  value === "yes" ? "left-7" : "left-1"
                }`}
              />
            </button>
            <span
              className={`text-sm font-semibold transition-colors ${value === "yes" ? "text-slate-900" : "text-slate-400"}`}
            >
              Yes
            </span>
          </div>
          {error && (
            <p className="flex items-center gap-1 text-red-500 text-[11px] font-medium">
              <svg
                className="w-3 h-3 shrink-0"
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.75 2.75a.75.75 0 011.5 0v2.5a.75.75 0 01-1.5 0v-2.5zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
              {error}
            </p>
          )}
        </div>
      ) : variant === "button-group" ? (
        /* ── Button-group variant: pill selector ── */
        <div className="flex flex-col gap-1.5">
          <div
            className={`inline-flex p-1 bg-slate-100 rounded-xl w-fit gap-0.5 ${
              error ? "ring-2 ring-red-500 rounded-xl" : ""
            }`}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`
                  px-6 py-2.5 rounded-[10px] text-sm font-bold transition-all duration-200 min-w-[90px]
                  ${
                    value === opt.value
                      ? "bg-white text-[var(--primary,#2e3192)] shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {error && (
            <p className="flex items-center gap-1 text-red-500 text-[11px] font-medium">
              <svg
                className="w-3 h-3 shrink-0"
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.75 2.75a.75.75 0 011.5 0v2.5a.75.75 0 01-1.5 0v-2.5zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
              {error}
            </p>
          )}
        </div>
      ) : (
        /* ── Standard variant: card-style radio rows ── */
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className={`
                flex items-center gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${
                  value === opt.value
                    ? "bg-[var(--primary-light,#eef0ff)] border-[var(--primary,#2e3192)] shadow-sm"
                    : error
                      ? "bg-white border-red-200 hover:border-red-300"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }
              `}
            >
              {/* Custom radio dot */}
              <div
                className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200
                  ${
                    value === opt.value
                      ? "border-[var(--primary,#2e3192)] bg-[var(--primary,#2e3192)]"
                      : "border-slate-300 bg-white"
                  }
                `}
              >
                {value === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span
                className={`text-sm font-semibold ${
                  value === opt.value
                    ? "text-[var(--primary,#2e3192)]"
                    : "text-slate-600"
                }`}
              >
                {opt.label}
              </span>
            </label>
          ))}
          {error && (
            <p className="flex items-center gap-1 text-red-500 text-[11px] font-medium">
              <svg
                className="w-3 h-3 shrink-0"
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.75 2.75a.75.75 0 011.5 0v2.5a.75.75 0 01-1.5 0v-2.5zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
