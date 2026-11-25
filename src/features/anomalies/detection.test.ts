import { describe, expect, it } from 'vitest';
import { detectDeviation, detectFixed } from './detection';
describe('explainable anomaly detection',()=>{
  it('requires enough history and detects deviation from median',()=>{expect(detectDeviation([1,1],2)).toBeNull(); expect(detectDeviation([10,10,10,10,10,10,10],15)?.baseline).toBe(10);});
  it('detects fixed readings only after enough samples',()=>{expect(detectFixed([1,1,1])).toBeNull(); expect(detectFixed([1,1,1,1,1,1])?.kind).toBe('fixed');});
});
