"use client";

import { InputHTMLAttributes, useState } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={isVisible ? "text" : "password"}
        className={`w-full border border-[rgba(255,255,255,0.08)] bg-[#060608] px-3 py-2.5 pr-11 text-sm text-[#f0eff5] placeholder-[#6b6a75] focus:outline-none focus:border-[#ff2d55] focus:ring-1 focus:ring-[#ff2d55]/30 transition-colors ${className}`.trim()}
      />
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-[#6b6a75] hover:text-[#f0eff5] transition-colors"
        aria-label={isVisible ? "パスワードを隠す" : "パスワードを表示"}
      >
        {isVisible ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 5.09A10.94 10.94 0 0112 5c5.25 0 9.27 3.11 10 7-1.04 5.02-6.55 7.87-11.1 6.57M6.23 6.23C4.06 7.48 2.54 9.28 2 12a10.94 10.94 0 003.56 5.18"
            />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
