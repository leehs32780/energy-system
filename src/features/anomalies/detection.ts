export type Detection = {kind:'deviation'|'fixed'|'missing';actual:number|null;baseline:number|null;explanation:string};
export function detectDeviation(values: number[], current: number, threshold = 0.3): Detection | null {
  if (values.length < 7 || !Number.isFinite(current) || values.some(v=>!Number.isFinite(v) || v < 0)) return null;
  const sorted = [...values].sort((a,b)=>a-b);
  const middle = Math.floor(sorted.length/2);
  const baseline = sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
  if (baseline <= 0 || Math.abs(current-baseline)/baseline < threshold) return null;
  return {kind:'deviation', actual:current, baseline, explanation:`중앙값 대비 ${((current-baseline)/baseline*100).toFixed(1)}% 차이`};
}
export function detectFixed(values: number[], minimum = 6): Detection | null {
  if (values.length < minimum || !values.every(v=>Number.isFinite(v) && v===values[0])) return null;
  return {kind:'fixed',actual:values[0],baseline:null,explanation:`${values.length}개 구간에서 동일한 값이 지속됨`};
}
