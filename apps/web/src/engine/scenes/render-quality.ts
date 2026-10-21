import type { QualityTier } from './scene';

/** CPU concurrency is a conservative startup hint; measured frame time still drives adaptive downgrade. */
export function initialQualityForConcurrency(concurrency: number | undefined): QualityTier {
  if (concurrency === undefined || !Number.isFinite(concurrency) || concurrency <= 0) return 'medium';
  if (concurrency <= 4) return 'low';
  if (concurrency <= 8) return 'medium';
  return 'high';
}
