export type Energy = 'electricity' | 'gas' | 'water';
export type Site = { id: string; name: string; short: string; area: number };
export type Reading = { siteId: string; date: string; energy: Energy; value: number; quality: 'normal' | 'missing' };
export const sites: Site[] = [
  {id:'pyeongtaek',name:'평택 제1공장',short:'평택',area:42800},
  {id:'incheon',name:'인천 물류센터',short:'인천',area:18600},
  {id:'seoul',name:'서울 본사',short:'서울',area:12400},
];
export const energyInfo = {
  electricity:{label:'전기',unit:'kWh',rate:165,factor:0.0004594,color:'#456bce'},
  gas:{label:'도시가스',unit:'Nm³',rate:950,factor:0.00215,color:'#e8a255'},
  water:{label:'수도',unit:'m³',rate:1200,factor:0,color:'#43a9a8'},
} satisfies Record<Energy,{label:string;unit:string;rate:number;factor:number;color:string}>;
// Deterministic simulated daily readings, deliberately not live operational data.
export function demoReadings(): Reading[] {
  const rows: Reading[] = [];
  const end = new Date(); end.setHours(12,0,0,0);
  for(let day=399; day>=0; day--) {
    const date = new Date(end); date.setDate(end.getDate()-day);
    const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const weekend = date.getDay()===0 || date.getDay()===6;
    sites.forEach((site,index)=> {
      const season = Math.cos((date.getMonth()-7)*Math.PI/6);
      const activity = weekend ? [0.68,0.88,0.37][index] : 1;
      const variation = 1 + Math.sin(day*0.47+index)*0.035;
      const values = [ [15600,7400,3100][index]*activity*(1+Math.max(season,0)*0.2), [540,240,150][index]*activity*(1+Math.max(-season,0)*0.6), [350,180,76][index]*activity ];
      (['electricity','gas','water'] as Energy[]).forEach((energy,i)=>rows.push({siteId:site.id,date:iso,energy,value:Math.round(values[i]*variation),quality:day===14 && index===1 && i===2?'missing':'normal'}));
    });
  }
  return rows;
}
export function cost(energy: Energy, value: number) { return value * energyInfo[energy].rate; }
export function carbon(energy: Energy, value: number) { return value * energyInfo[energy].factor; }
