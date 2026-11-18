import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "h-5 w-5", size }: LogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      className={className}
      style={style}
      fill="none"
      aria-label="Smart Split Logo"
    >
      <defs>
        <linearGradient id="logoLocalGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#059669" />
          <stop offset="100%" stop-color="#34D399" />
        </linearGradient>
        <linearGradient id="logoCloudGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#2563EB" />
          <stop offset="100%" stop-color="#60A5FA" />
        </linearGradient>
        <linearGradient id="logoStemGrad" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stop-color="#4B5563" />
          <stop offset="60%" stop-color="#9CA3AF" />
          <stop offset="100%" stop-color="#F3F4F6" />
        </linearGradient>
      </defs>

      {/* Ambient Internal Glow */}
      <circle cx="44" cy="46" r="18" fill="#34D399" opacity="0.18" />
      <circle cx="84" cy="46" r="18" fill="#60A5FA" opacity="0.18" />

      {/* Left Branch to Local (Emerald) */}
      <path
        d="M64 92 V68 C64 56 44 56 44 48"
        stroke="url(#logoLocalGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right Branch to Cloud (Blue) */}
      <path
        d="M64 92 V68 C64 56 84 56 84 48"
        stroke="url(#logoCloudGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center Input Trunk */}
      <path
        d="M64 94 V72"
        stroke="url(#logoStemGrad)"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Origin Pulse Point */}
      <circle cx="64" cy="94" r="5" fill="#F3F4F6" />

      {/* Left Local Node (Emerald) */}
      <circle cx="44" cy="46" r="11" fill="url(#logoLocalGrad)" />
      <circle cx="44" cy="46" r="5" fill="#FFFFFF" />

      {/* Right Cloud Node (Blue) */}
      <circle cx="84" cy="46" r="11" fill="url(#logoCloudGrad)" />
      <circle cx="84" cy="46" r="5" fill="#FFFFFF" />

      {/* Triage Divergence Pulse Core */}
      <circle cx="64" cy="68" r="4.5" fill="#F3F4F6" />
    </svg>
  );
}
