import { NextResponse } from 'next/server';
import { currentRole } from '@/server/demo/auth';
import { readEnergy } from '@/server/energy/repository';
import { energyInfo, cost, type Energy } from '@/features/energy/model';
import { recentRange } from '@/shared/lib/dates';
import { dailyCoverage } from '@/features/energy/import';

function cell(value:string|number){const text=String(value);const safe=/^[\s]*[=+@\-\t\r]/.test(text)?`'${text}`:text;return `"${safe.replaceAll('"','""')}"`;}
export async function GET(request:Request){
 const role=await currentRole();if(!role)return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 const params=new URL(request.url).searchParams;const site=params.get('site')||'all';const days=Number(params.get('days')||30);
 if(![7,30,90].includes(days))return NextResponse.json({error:'조회 기간을 확인하세요.'},{status:400});
 try{
  const data=await readEnergy(role);const target=site==='all'?null:data.sites.find(item=>item.id===site);if(site!=='all'&&!target)return NextResponse.json({error:'사업장을 찾을 수 없습니다.'},{status:404});
  const range=recentRange(days);const rows=data.readings.filter(row=>(site==='all'||row.siteId===site)&&row.date>=range.from&&row.date<=range.to);
  const lines:(string|number)[][]=[['에너지 사용 현황 보고서'],['생성 시각',new Date().toISOString()],['범위',target?.name??'접근 가능한 전체 사업장'],['시작일',range.from],['종료일',range.to],['데이터 출처',data.source],['주의','금액은 데모 단가를 적용한 추정치이며 실제 청구 금액이 아닙니다. 품질 제외 행은 합계에서 제외되며 미수집 날짜는 제외 행 수에 포함되지 않습니다.'],[],['에너지원','사용량','단위','추정 비용(원)','정상 행 수','품질 제외 행 수']];
  for(const energy of ['electricity','gas','water'] as Energy[]){const selected=rows.filter(row=>row.energy===energy);const valid=selected.filter(row=>row.quality==='normal');const value=valid.reduce((sum,row)=>sum+row.value,0);lines.push([energyInfo[energy].label,valid.length?value:'',energyInfo[energy].unit,valid.length?cost(energy,value):'',valid.length,selected.length-valid.length]);}
  lines.push([],['데이터 완전성 (사업장별 일수)'],['사업장','에너지원','예상 일수','수신 일수','미수신 일수']);
  for(const location of target?[target]:data.sites){for(const energy of ['electricity','gas','water'] as Energy[]){const coverage=dailyCoverage(rows.filter(row=>row.siteId===location.id&&row.energy===energy).map(row=>row.date),range.from,range.to);lines.push([location.name,energyInfo[energy].label,coverage.expected,coverage.observed,coverage.missing]);}}
  const body='\uFEFF'+lines.map(row=>row.map(cell).join(',')).join('\r\n');
  return new NextResponse(body,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="energy-report.csv"','Cache-Control':'no-store'}});
 }catch(error){console.error('Report generation failed',error);return NextResponse.json({error:'보고서를 생성하지 못했습니다.'},{status:503});}
}
