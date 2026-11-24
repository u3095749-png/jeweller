import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { RobotVisualState } from '../types/assistant.ts';

interface RobotAvatarProps {
  state: RobotVisualState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-12 h-12',
} as const;

export function RobotAvatar({ state, size = 'md', className = '' }: RobotAvatarProps) {
  const prefersReducedMotion = useReducedMotion();

  const bodyAnimate = prefersReducedMotion
    ? {}
    : state === 'listening'
    ? { y: [0, -2.5, 0], scale: [1, 1.03, 1] }
    : state === 'thinking'
    ? { y: [0, -2, 0], rotate: [-2, 2, -2] }
    : state === 'speaking'
    ? { y: [0, -1.5, 0, -1, 0] }
    : state === 'error'
    ? { rotate: [-3, 3, 0] }
    : { y: [0, -2, 0] };

  const bodyTransition = prefersReducedMotion
    ? undefined
    : state === 'speaking'
    ? { duration: 0.65, repeat: Infinity, ease: 'easeInOut' as const }
    : state === 'thinking'
    ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' as const }
    : state === 'listening'
    ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' as const }
    : state === 'error'
    ? { duration: 0.45, repeat: 1, ease: 'easeInOut' as const }
    : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const };

  const gemColor =
    state === 'listening'
      ? '#4ADE80'
      : state === 'thinking'
      ? '#FBBF24'
      : state === 'speaking'
      ? '#F6D992'
      : state === 'error'
      ? '#F87171'
      : '#E3C992';

  const eyeColor =
    state === 'listening'
      ? '#6EE7B7'
      : state === 'error'
      ? '#FCA5A5'
      : '#E5C37A';

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${SIZE_MAP[size]} ${className}`}>
      {/* Acoustic / Status Halo */}
      {!prefersReducedMotion && (state === 'listening' || state === 'speaking') && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-[#C6A15B]"
          initial={{ scale: 0.9, opacity: 0.7 }}
          animate={{ scale: [0.95, 1.32], opacity: [0.65, 0] }}
          transition={{ duration: state === 'listening' ? 1.1 : 0.85, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      <motion.svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_3px_8px_rgba(37,37,37,0.22)]"
        animate={bodyAnimate}
        transition={bodyTransition}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="zaRobotGold" x1="8" y1="12" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E6CC96" />
            <stop offset="50%" stopColor="#C6A15B" />
            <stop offset="100%" stopColor="#8E6E30" />
          </linearGradient>
          <linearGradient id="zaRobotVisor" x1="16" y1="22" x2="48" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2E2D2B" />
            <stop offset="100%" stopColor="#191817" />
          </linearGradient>
        </defs>

        {/* Diamond Antenna */}
        <line x1="32" y1="10" x2="32" y2="17" stroke="#8E6E30" strokeWidth="2.2" strokeLinecap="round" />
        <motion.polygon
          points="32,3 37,8 32,12 27,8"
          fill={gemColor}
          stroke="#8E6E30"
          strokeWidth="1"
          animate={
            prefersReducedMotion
              ? undefined
              : state === 'thinking'
              ? { opacity: [0.55, 1, 0.55], scale: [0.95, 1.12, 0.95] }
              : { opacity: [0.85, 1, 0.85] }
          }
          transition={{ duration: state === 'thinking' ? 0.8 : 2.2, repeat: Infinity }}
          style={{ transformOrigin: '32px 8px' }}
        />

        {/* Side Acoustic Ear Pods */}
        <rect x="6" y="27" width="6" height="14" rx="3" fill="url(#zaRobotGold)" stroke="#6D5320" strokeWidth="1" />
        <rect x="52" y="27" width="6" height="14" rx="3" fill="url(#zaRobotGold)" stroke="#6D5320" strokeWidth="1" />
        <circle cx="9" cy="34" r="1.5" fill={state === 'listening' ? '#6EE7B7' : '#FFFDF8'} />
        <circle cx="55" cy="34" r="1.5" fill={state === 'listening' ? '#6EE7B7' : '#FFFDF8'} />

        {/* Main Sculpted Head Shell */}
        <rect
          x="11"
          y="17"
          width="42"
          height="33"
          rx="14"
          fill="url(#zaRobotGold)"
          stroke="#7A5D24"
          strokeWidth="1.2"
        />
        {/* Subtle Champagne Highlight */}
        <path d="M20 20.5H44" stroke="#FFF8EA" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />

        {/* Inner Dark Glass Visor */}
        <rect x="16" y="23" width="32" height="21" rx="9" fill="url(#zaRobotVisor)" />

        {/* Expressive Eyes */}
        {state === 'thinking' ? (
          <>
            <motion.circle
              cx="25"
              cy="31"
              r="2.6"
              fill={eyeColor}
              animate={prefersReducedMotion ? undefined : { cx: [24, 26.5, 24] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <motion.circle
              cx="39"
              cy="31"
              r="2.6"
              fill={eyeColor}
              animate={prefersReducedMotion ? undefined : { cx: [38, 40.5, 38] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            {/* Thinking LED Dots */}
            <motion.circle
              cx="27"
              cy="39"
              r="1.3"
              fill="#E5C37A"
              animate={prefersReducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: 0 }}
            />
            <motion.circle
              cx="32"
              cy="39"
              r="1.3"
              fill="#E5C37A"
              animate={prefersReducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: 0.2 }}
            />
            <motion.circle
              cx="37"
              cy="39"
              r="1.3"
              fill="#E5C37A"
              animate={prefersReducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: 0.4 }}
            />
          </>
        ) : state === 'speaking' ? (
          <>
            {/* Happy curved eyes */}
            <path d="M21.5 32.5C22.5 30.2 26.5 30.2 27.5 32.5" stroke={eyeColor} strokeWidth="2.3" strokeLinecap="round" />
            <path d="M36.5 32.5C37.5 30.2 41.5 30.2 42.5 32.5" stroke={eyeColor} strokeWidth="2.3" strokeLinecap="round" />
            {/* Animated Speaking Voice Equalizer */}
            <motion.rect
              x="26"
              y="37"
              width="2.2"
              height="4"
              rx="1"
              fill={eyeColor}
              animate={prefersReducedMotion ? undefined : { height: [2.5, 5.5, 2.5], y: [38, 36.5, 38] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            <motion.rect
              x="30.9"
              y="36"
              width="2.2"
              height="6"
              rx="1"
              fill={eyeColor}
              animate={prefersReducedMotion ? undefined : { height: [6, 2.5, 6], y: [36, 38, 36] }}
              transition={{ duration: 0.35, repeat: Infinity }}
            />
            <motion.rect
              x="35.8"
              y="37"
              width="2.2"
              height="4"
              rx="1"
              fill={eyeColor}
              animate={prefersReducedMotion ? undefined : { height: [2.5, 5.2, 2.5], y: [38, 36.6, 38] }}
              transition={{ duration: 0.45, repeat: Infinity }}
            />
          </>
        ) : (
          <>
            {/* Idle / Listening / Error Eyes with Blink */}
            <motion.ellipse
              cx="24.5"
              cy="32"
              rx="2.6"
              ry={state === 'listening' ? 3.2 : 2.8}
              fill={eyeColor}
              animate={
                prefersReducedMotion || state !== 'idle'
                  ? undefined
                  : { scaleY: [1, 1, 0.12, 1, 1] }
              }
              transition={{ duration: 4.2, times: [0, 0.9, 0.94, 0.98, 1], repeat: Infinity }}
              style={{ transformOrigin: '24.5px 32px' }}
            />
            <motion.ellipse
              cx="39.5"
              cy="32"
              rx="2.6"
              ry={state === 'listening' ? 3.2 : 2.8}
              fill={eyeColor}
              animate={
                prefersReducedMotion || state !== 'idle'
                  ? undefined
                  : { scaleY: [1, 1, 0.12, 1, 1] }
              }
              transition={{ duration: 4.2, times: [0, 0.9, 0.94, 0.98, 1], repeat: Infinity }}
              style={{ transformOrigin: '39.5px 32px' }}
            />
            {/* Warm Smile */}
            <path
              d={state === 'error' ? 'M28 39.5C30 37.8 34 37.8 36 39.5' : 'M27.5 37.5C29.5 39.8 34.5 39.8 36.5 37.5'}
              stroke={eyeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Sculpted Collar / Shoulders */}
        <path
          d="M21 52C21 49.8 25.9 49 32 49C38.1 49 43 49.8 43 52L45 58H19L21 52Z"
          fill="#252525"
          stroke="#C6A15B"
          strokeWidth="1.2"
        />
        <circle cx="32" cy="54" r="1.8" fill="#C6A15B" />
      </motion.svg>
    </div>
  );
}
