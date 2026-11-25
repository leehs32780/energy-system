import { describe, expect, it } from 'vitest';
import { calculateCarbon, calculateCost, calculateSavings, cumulativeDifference } from './calculations';

describe('energy calculations', () => {
  it('keeps negative cumulative differences as quality issues', () => { expect(cumulativeDifference(100, 99)).toEqual({value:null,quality:'reverse'}); });
  it('calculates consumption and cost', () => { expect(cumulativeDifference(100, 125).value).toBe(25); expect(calculateCost('electricity', 10)).toBe(1650); });
  it('does not report missing water emissions factors as zero', () => { expect(calculateCarbon('water', 10)).toBeNull(); });
  it('calculates adjusted savings including negative outcomes', () => { expect(calculateSavings(100, 120, 10)).toEqual({adjusted:110,quantity:-10,percentage:-10/110*100}); });
  it('rejects an invalid baseline', () => { expect(()=>calculateSavings(0, 1)).toThrow(); });
});
