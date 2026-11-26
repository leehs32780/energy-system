import type { Reading } from '@/features/energy/model';
import { detectDeviation } from './detection';
import type { Anomaly } from './model';

// Preserve reviewed alerts even after the latest reading advances.
export function mergeDailyAlerts(saved:Anomaly[], generated:Anomaly[], source:string):Anomaly[]{
 const relevant=saved.filter(event=>event.id.startsWith(`daily:${source}:`));
 const ids=new Set(relevant.map(event=>event.id));
 return [...relevant,...generated.filter(event=>!ids.has(event.id))];
}

// Only compares the same weekday; this does not infer overnight usage or weather effects.
export function detectDailyElectricity(readings:Reading[],source='simulation'):Anomaly[]{
 const bySite=new Map<string,Map<string,number>>();
 const latestObserved=new Map<string,string>();const invalidDates=new Set<string>();
 for(const row of readings){if(row.energy!=='electricity')continue;const latest=latestObserved.get(row.siteId);if(!latest||row.date>latest)latestObserved.set(row.siteId,row.date);if(row.quality!=='normal'){invalidDates.add(`${row.siteId}:${row.date}`);continue;}const dates=bySite.get(row.siteId)??new Map<string,number>();dates.set(row.date,(dates.get(row.date)??0)+row.value);bySite.set(row.siteId,dates);}
 const events:Anomaly[]=[];
 for(const [siteId,dates] of bySite){
  const ordered=[...dates.entries()].filter(([date])=>!invalidDates.has(`${siteId}:${date}`)).sort(([a],[b])=>a.localeCompare(b));const latest=ordered.at(-1);if(!latest||latest[0]!==latestObserved.get(siteId))continue;
  const weekday=new Date(`${latest[0]}T00:00:00Z`).getUTCDay();
  const history=ordered.slice(0,-1).filter(([date])=>new Date(`${date}T00:00:00Z`).getUTCDay()===weekday).slice(-8).map(([,value])=>value);
  const detection=detectDeviation(history,latest[1],0.3);if(!detection||detection.baseline===null||latest[1]<=detection.baseline)continue;
  const pct=(latest[1]/detection.baseline-1)*100;
  events.push({id:`daily:${source}:${siteId}:${latest[0]}`,siteId,title:'동일 요일 대비 일별 전력 과다 의심',asset:`일별 전력 · ${latest[0]}`,severity:pct>=50?'높음':'주의',energy:'전기',current:`${latest[1].toLocaleString('ko-KR')} kWh/일`,baseline:`${detection.baseline.toLocaleString('ko-KR')} kWh/일`,impact:'현장 확인 필요',reason:`${latest[0]} 사용량이 이전 동일 요일 ${history.length}일 중앙값보다 ${pct.toFixed(1)}% 높습니다. 기온·생산량은 보정하지 않았습니다.`,action:'가동일·생산량과 설비 운전 이력을 확인하세요.',status:'신규'});
 }
 return events;
}
