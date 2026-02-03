'use client';

import { ChartInput } from '../types';

export const PIE_PALETTE = [
  '#2563eb', // blue
  '#16a34a', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#0ea5e9', // sky
];

export const DEFAULT_BAR_LINE_COLOR = '#2563eb';

export function resolveSliceColors(input: ChartInput) {
  return input.palette && input.palette.length > 0 ? input.palette : PIE_PALETTE;
}

export function resolveSeriesColor(input: ChartInput) {
  return input.color || DEFAULT_BAR_LINE_COLOR;
}
