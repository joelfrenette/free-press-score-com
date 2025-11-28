import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBiasColor(biasScore: number): string {
  if (biasScore <= -1.5) return 'text-[var(--far-left)]';
  if (biasScore <= -0.5) return 'text-[var(--left-bias)]';
  if (biasScore < 0.5) return 'text-[var(--center-bias)]';
  if (biasScore < 1.5) return 'text-[var(--right-bias)]';
  return 'text-[var(--far-right)]';
}

export function getBiasLabel(biasScore: number): string {
  if (biasScore <= -1.5) return 'Far Left';
  if (biasScore <= -0.5) return 'Left';
  if (biasScore < 0.5) return 'Center';
  if (biasScore < 1.5) return 'Right';
  return 'Far Right';
}

export function getBiasBgColor(biasScore: number): string {
  if (biasScore <= -1.5) return 'bg-[var(--far-left)]/10 border-[var(--far-left)]/30';
  if (biasScore <= -0.5) return 'bg-[var(--left-bias)]/10 border-[var(--left-bias)]/30';
  if (biasScore < 0.5) return 'bg-[var(--center-bias)]/10 border-[var(--center-bias)]/30';
  if (biasScore < 1.5) return 'bg-[var(--right-bias)]/10 border-[var(--right-bias)]/30';
  return 'bg-[var(--far-right)]/10 border-[var(--far-right)]/30';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}
