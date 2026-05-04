import type { BodyStats } from '@/components/context/DataContext';

/**
 * Calculates a 7-day simple moving average of body weight.
 * Requires entries to be sorted oldest-first before calling.
 *
 * @param entries - Body stats sorted chronologically (oldest first)
 * @returns Array of { date, avg } for each entry that has ≥1 data point in the window
 */
export function calculate7DayMovingAverage(
  entries: BodyStats[],
): { date: string; avg: number }[] {
  const withWeight = entries.filter(e => typeof e.weight === 'number');

  return withWeight.map((entry, idx) => {
    const entryDate = new Date(entry.date).getTime();
    const windowStart = entryDate - 6 * 24 * 60 * 60 * 1000; // 6 days before + today = 7-day window

    const windowEntries = withWeight
      .slice(0, idx + 1)
      .filter(e => new Date(e.date).getTime() >= windowStart);

    const sum = windowEntries.reduce((acc, e) => acc + (e.weight as number), 0);
    const avg = sum / windowEntries.length;

    return {
      date: entry.date,
      avg: Math.round(avg * 10) / 10, // round to 1 decimal
    };
  });
}
