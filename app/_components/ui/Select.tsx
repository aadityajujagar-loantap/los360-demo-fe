"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useScrollToFieldError } from "@/app/_hooks/useScrollToFieldError";

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  name?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onOpen?: () => void;
}

export default function Select({
  label,
  name,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  error,
  disabled = false,
  required = false,
  className = "",
  onOpen,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const errorFieldRef = useScrollToFieldError<HTMLDivElement>(error);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const selectedOption = options.find((opt) => opt.value === value);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedSearchTerm) return options;
    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(normalizedSearchTerm),
    );
  }, [normalizedSearchTerm, options]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchTerm("");
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  const handleToggleOpen = () => {
    setSearchTerm("");
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && onOpen) {
      onOpen();
    }
  };

  const handleSelect = (optionValue: string) => {
    if (disabled) return;
    onChange?.(optionValue);
    setSearchTerm("");
    setIsOpen(false);
  };

  const setContainerRefs = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    errorFieldRef.current = node;
  };

  return (
    <div
      ref={setContainerRefs}
      data-field-error={error ? "true" : undefined}
      data-field-name={name}
      className={`scroll-mt-24 relative flex flex-col gap-2 w-full ${isOpen ? "z-[1000]" : "z-0"} ${className}`}
    >
      {label && (
        <label className="text-[12px] font-bold text-gray-500 tracking-wider uppercase">
          {label}
          {required && <span className="text-[var(--primary,#2e3192)] ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggleOpen}
          className={`
            relative w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium
            transition-all duration-200 outline-none group
            ${disabled 
              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed" 
              : error
                ? "bg-white border-red-400 ring-4 ring-red-50"
                : isOpen
                  ? "bg-white border-[var(--primary,#2e3192)] ring-4 ring-[var(--primary,#2e3192)]/10"
                  : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
            }
          `}
        >
          <span className={`truncate ${!value ? "text-gray-400 font-normal" : "text-gray-800"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          <div className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
            <svg
              className={`w-4 h-4 ${disabled ? "text-gray-300" : "text-gray-400 group-hover:text-gray-600"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div 
            className="absolute z-[1001] w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in slide-in-from-top-2 duration-200 origin-top flex flex-col"
            style={{ maxHeight: "min(600px, 80vh)" }}
          >
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.1-5.15a6.25 6.25 0 11-12.5 0 6.25 6.25 0 0112.5 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="search"
                  autoComplete="off"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search options"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:border-[var(--primary,#2e3192)] focus:ring-4 focus:ring-[var(--primary,#2e3192)]/10"
                />
              </div>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-1.5 flex-1 h-full">
              {options.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center italic">
                  No options available
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center italic">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isActive = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-all
                        ${isActive 
                          ? "bg-[var(--primary-light,#f0f4ff)] text-[var(--primary,#2e3192)] font-bold" 
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}
                    >
                      <span>{option.label}</span>
                      {isActive && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-[11px] font-bold flex items-center gap-1.5 mt-0.5 animate-in fade-in slide-in-from-top-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
