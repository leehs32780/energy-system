import { energyInfo, type Energy } from './model';

export function cumulativeDifference(previous: number, current: number): { value: number | null; quality: 'normal' | 'reverse' } {
  if (!Number.isFinite(previous) || !Number.isFinite(current) || current < previous) return { value: null, quality: 'reverse' };
  return { value: current - previous, quality: 'normal' };
}
export function calculateCost(energy: Energy, quantity: number): number { return quantity * energyInfo[energy].rate; }
export function calculateCarbon(energy: Energy, quantity: number): number | null {
  // Water emissions depend on local treatment factors; never imply a measured zero.
  return energy === 'water' ? null : quantity * energyInfo[energy].factor;
}
export function calculateSavings(baseline: number, actual: number, adjustment = 0) {
  const adjusted = baseline + adjustment;
  if (![baseline, actual, adjustment].every(Number.isFinite) || baseline < 0 || actual < 0 || adjusted <= 0) throw new Error('유효한 기준선과 사용량을 입력하세요.');
  const quantity = adjusted - actual;
  return { adjusted, quantity, percentage: quantity / adjusted * 100 };
}
