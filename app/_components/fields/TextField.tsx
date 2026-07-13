"use client";

import { useScrollToFieldError } from "@/app/_hooks/useScrollToFieldError";
import { sanitizeMobileNumber } from "@/app/_lib/validation/mobile";

type FieldOption = {
  label: string;
  value: string;
};

type FieldError = string | string[];

type BaseFieldProps = {
  label?: string;
  name: string;
  required?: boolean;
  error?: FieldError;
};

type TextFieldProps = BaseFieldProps & {
  value?: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
};

type CheckboxGroupProps = BaseFieldProps & {
  value?: boolean;
  onChange: (value: boolean) => void;
};

type OTPFieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  error?: FieldError;
  placeholder?: string;
};

type SelectFieldProps = BaseFieldProps & {
  value?: string;
  onChange: (value: string) => void;
  options?: FieldOption[];
  placeholder?: string;
};

type FileFieldProps = BaseFieldProps & {
  value?: string | File;
  onChange: (value: File) => void;
  options?: FieldOption[];
  selectedType?: string;
  onTypeChange?: (value: string) => void;
};

const getErrorMessage = (error?: FieldError) => {
  if (Array.isArray(error)) return error.find(Boolean);
  return error;
};

/**
 * TextField — Premium text/number/date input using CSS var tokens.
 * This is the version used by FieldFactory (config-driven fields).
 */
export function TextField({
  label,
  name,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  error,
}: TextFieldProps) {
  const isMobileField = name === "mobile" || /mobile/i.test(label ?? "");
  const errorMessage = getErrorMessage(error);
  const fieldRef = useScrollToFieldError<HTMLDivElement>(errorMessage);

  return (
    <div
      ref={fieldRef}
      data-field-error={errorMessage ? "true" : undefined}
      data-field-name={name}
      className="scroll-mt-24 flex flex-col gap-1.5 w-full"
    >
      {label && (
        <label className="text-[12.5px] font-semibold text-slate-600 tracking-wide uppercase">
          {label}{" "}
          {required && (
            <span className="text-[var(--primary,#2e3192)] ml-0.5">*</span>
          )}
        </label>
      )}
      <input
        type={type}
        name={name}
        autoComplete={type === "password" ? "new-password" : "off"}
        placeholder={placeholder ?? `Enter ${label?.toLowerCase() ?? ""}`}
        value={value ?? ""}
        onChange={(e) => {
          const nextValue = isMobileField
            ? sanitizeMobileNumber(e.target.value)
            : e.target.value;
          onChange(nextValue);
        }}
        className={`
          w-full px-4 py-3 rounded-xl border text-sm font-medium text-slate-800
          outline-none transition-all duration-200
          placeholder:text-slate-300 placeholder:font-normal
          ${
            errorMessage
              ? "bg-white border-red-400 ring-2 ring-red-100 focus:border-red-500"
              : "bg-white border-slate-200 hover:border-slate-300 focus:border-[var(--primary,#2e3192)] focus:ring-2 focus:ring-[var(--primary,#2e3192)]/10"
          }
        `}
      />
      {errorMessage && (
        <p className="flex items-center gap-1 text-red-500 text-[11px] font-medium">
          <svg
            className="w-3 h-3 shrink-0"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.75 2.75a.75.75 0 011.5 0v2.5a.75.75 0 01-1.5 0v-2.5zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * CheckboxGroup — Styled checkbox with branded accent color.
 */
export function CheckboxGroup({
  label,
  name,
  value,
  onChange,
  required,
  error,
}: CheckboxGroupProps) {
  const errorMessage = getErrorMessage(error);
  const fieldRef = useScrollToFieldError<HTMLDivElement>(errorMessage);

  return (
    <div
      ref={fieldRef}
      data-field-error={errorMessage ? "true" : undefined}
      data-field-name={name}
      className="scroll-mt-24 flex flex-col gap-1"
    >
      <label
        className={`
          flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
          ${
            value
              ? "bg-[var(--primary-light,#eef0ff)] border-[var(--primary,#2e3192)]"
              : errorMessage
                ? "bg-red-50 border-red-200"
                : "bg-white border-slate-200 hover:border-slate-300"
          }
        `}
      >
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`
              w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200
              ${
                value
                  ? "bg-[var(--primary,#2e3192)] border-[var(--primary,#2e3192)]"
                  : errorMessage
                    ? "border-red-400 bg-white"
                    : "border-slate-300 bg-white"
              }
            `}
          >
            {value && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
        <span
          className={`text-sm font-medium leading-relaxed ${value ? "text-[var(--primary,#2e3192)]" : "text-slate-700"}`}
        >
          {label}{" "}
          {required && <span className="text-[var(--primary,#2e3192)]">*</span>}
        </span>
      </label>
      {errorMessage && (
        <p className="flex items-center gap-1 text-red-500 text-[11px] font-medium ml-1">
          <svg
            className="w-3 h-3 shrink-0"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.75 2.75a.75.75 0 011.5 0v2.5a.75.75 0 01-1.5 0v-2.5zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * OTPField — Large centered OTP input with generous tracking.
 */
export function OTPField({ label, value, onChange, error, placeholder }: OTPFieldProps) {
  const errorMessage = getErrorMessage(error);
  const fieldRef = useScrollToFieldError<HTMLDivElement>(errorMessage);

  return (
    <div
      ref={fieldRef}
      data-field-error={errorMessage ? "true" : undefined}
      className="scroll-mt-24 flex flex-col gap-1.5 w-full"
    >
      <label className="text-[12.5px] font-semibold text-slate-600 tracking-wide uppercase">
        {label} <span className="text-[var(--primary,#2e3192)]">*</span>
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        placeholder={placeholder ?? "• • • • • •"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className={`
          w-full px-6 py-4 rounded-xl border text-2xl font-bold tracking-[0.6em] text-center
          text-slate-800 outline-none transition-all duration-200
          ${
            errorMessage
              ? "bg-white border-red-400 ring-2 ring-red-100 focus:border-red-500"
              : "bg-white border-slate-200 hover:border-slate-300 focus:border-[var(--primary,#2e3192)] focus:ring-2 focus:ring-[var(--primary,#2e3192)]/10"
          }
        `}
      />
      {errorMessage && (
        <p className="flex items-center gap-1 text-red-500 text-[11px] font-medium">
          <svg
            className="w-3 h-3 shrink-0"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.75 2.75a.75.75 0 011.5 0v2.5a.75.75 0 01-1.5 0v-2.5zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * SelectField — Premium dropdown using CSS var tokens.
 */
export function SelectField({
  label,
  name,
  value,
  onChange,
  required,
  options = [],
  error,
  placeholder,
}: SelectFieldProps) {
  const errorMessage = getErrorMessage(error);
  const fieldRef = useScrollToFieldError<HTMLDivElement>(errorMessage);

  return (
    <div
      ref={fieldRef}
      data-field-error={errorMessage ? "true" : undefined}
      data-field-name={name}
      className="scroll-mt-24 flex flex-col gap-1.5 w-full"
    >
      {label && (
        <label className="text-[12.5px] font-semibold text-slate-600 tracking-wide uppercase">
          {label}{" "}
          {required && (
            <span className="text-[var(--primary,#2e3192)] ml-0.5">*</span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          name={name}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full px-4 py-3 rounded-xl border text-sm font-medium
            outline-none appearance-none transition-all duration-200
            ${
              errorMessage
                ? "bg-white border-red-400 ring-2 ring-red-100 focus:border-red-500"
                : "bg-white border-slate-200 hover:border-slate-300 focus:border-[var(--primary,#2e3192)] focus:ring-2 focus:ring-[var(--primary,#2e3192)]/10"
            }
            ${!value ? "text-slate-400" : "text-slate-800"}
          `}
        >
          <option value="" disabled>
            {placeholder ?? `Select ${label?.toLowerCase() ?? ""}`}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-slate-800">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {errorMessage && (
        <p className="flex items-center gap-1 text-red-500 text-[11px] font-medium">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * FileField — Premium upload component with visual feedback.
 */
export function FileField({
  label,
  name,
  value,
  onChange,
  required,
  error,
  options,
  selectedType,
  onTypeChange,
}: FileFieldProps) {
  const errorMessage = getErrorMessage(error);
  const fieldRef = useScrollToFieldError<HTMLDivElement>(errorMessage);

  return (
    <div
      ref={fieldRef}
      data-field-error={errorMessage ? "true" : undefined}
      data-field-name={name}
      className="scroll-mt-24 flex flex-col gap-1.5 w-full"
    >
      {label && (
        <label className="text-[12.5px] font-semibold text-slate-600 tracking-wide uppercase">
          {label}{" "}
          {required && (
            <span className="text-[var(--primary,#2e3192)] ml-0.5">*</span>
          )}
        </label>
      )}

      {/* Optional selection dropdown for document type */}
      {options && options.length > 0 && (
        <div className="mb-2">
          <select
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white outline-none focus:border-[var(--primary,#2e3192)] transition-all"
            value={selectedType || ""}
            onChange={(e) => onTypeChange?.(e.target.value)}
          >
            <option value="" disabled>Select {label} Type</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      <div 
        className={`
          relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all duration-200
          ${
            value 
              ? "bg-[var(--primary-light,#eef0ff)] border-[var(--primary,#2e3192)]/30" 
              : errorMessage 
                ? "bg-red-50 border-red-200" 
                : "bg-slate-50 border-slate-200 hover:border-slate-300"
          }
          ${options && !selectedType ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input 
          key={`${name}-${selectedType || "no-type"}`}
          type="file"
          id={name}
          className="sr-only"
          onChange={(e) => {
             const file = e.target.files?.[0];
             if (file) onChange(file); // Return actual file object for complex handling
             e.currentTarget.value = "";
          }}
        />
        <label htmlFor={name} className="cursor-pointer flex flex-col items-center gap-2 text-center">
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${value ? 'bg-[var(--primary,#2e3192)] text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
              {value ? (
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                 </svg>
              ) : (
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                 </svg>
              )}
           </div>
           <div>
              <p className={`text-sm font-bold ${value ? 'text-[var(--primary,#2e3192)]' : 'text-slate-800'}`}>
                 {value ? (typeof value === 'string' ? value : value.name) : (options && !selectedType ? "Select type first" : "Tap to Upload")}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">PDF, JPG, PNG up to 5MB</p>
           </div>
        </label>
      </div>
      {errorMessage && (
        <p className="flex items-center gap-1 text-red-500 text-[11px] font-medium">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
