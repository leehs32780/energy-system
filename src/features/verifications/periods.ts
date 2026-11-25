import type {Reading} from '@/features/energy/model';
const DAY=86400000;
function parseDate(value:string):number {if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('날짜 형식을 확인하세요.');const ms=Date.parse(`${value}T00:00:00.000Z`);if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value)throw new Error('유효한 날짜를 입력하세요.');return ms;}
export function compareDailyPeriods(readings:Reading[],siteId:string,baselineStart:string,baselineEnd:string,actualStart:string,actualEnd:string){
 const bs=parseDate(baselineStart),be=parseDate(baselineEnd),as=parseDate(actualStart),ae=parseDate(actualEnd);
 const days=(be-bs)/DAY+1;
 if(be<bs||ae<as||be>=as||days!==(ae-as)/DAY+1||days<7||days%7!==0||days>364)throw new Error('겹치지 않는 동일 길이의 7일 배수 기간(최대 364일)을 입력하세요.');
 const data=new Map<string,number>();const bad=new Set<string>();
 for(const row of readings){if(row.siteId!==siteId||row.energy!=='electricity')continue;if(data.has(row.date)||row.quality!=='normal'||!Number.isFinite(row.value)||row.value<0){bad.add(row.date);continue;}data.set(row.date,row.value);}
 function total(start:number,end:number){let value=0;for(let date=start;date<=end;date+=DAY){const key=new Date(date).toISOString().slice(0,10);if(bad.has(key)||!data.has(key))throw new Error(`데이터가 없거나 중복·품질 문제가 있습니다: ${key}`);value+=data.get(key)!;}return value;}
 return {baseline:total(bs,be),actual:total(as,ae),days,baselineStart,baselineEnd,actualStart,actualEnd};
}
