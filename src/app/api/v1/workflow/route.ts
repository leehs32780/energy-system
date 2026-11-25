import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { canAccess, currentRole, roles, sameOrigin } from '@/server/demo/auth';
import { mutateDemo, readDemo } from '@/server/demo/store';
import { verificationInput, verify } from '@/features/verifications/model';
import { detectDailyElectricity } from '@/features/anomalies/daily';
import { readEnergy } from '@/server/energy/repository';
import { compareDailyPeriods } from '@/features/verifications/periods';
const createSchema=z.object({action:z.literal('createMeasure'),title:z.string().trim().min(2).max(120),siteId:z.enum(['pyeongtaek','incheon','seoul']),owner:z.string().trim().min(1).max(60),expected:z.number().finite().nonnegative().max(1e12)});
const anomalySchema=z.object({action:z.literal('updateAnomaly'),id:z.string().min(1).max(100),status:z.enum(['신규','검토 중','조치 계획','조치 진행','효과 검증','해결','오탐','보류']),reason:z.string().trim().min(2).max(500)});
const measureSchema=z.object({action:z.literal('updateMeasure'),id:z.string().min(1).max(100),status:z.enum(['발굴','검토/승인 대기','계획됨','진행 중','검증 대기','완료','중단'])});
const verifySchema=verificationInput.extend({action:z.literal('verify')});
const verifyMeterSchema=z.object({action:z.literal('verifyMeter'),measureId:z.string().min(1).max(100),baselineStart:z.string().length(10),baselineEnd:z.string().length(10),actualStart:z.string().length(10),actualEnd:z.string().length(10),note:z.string().trim().min(2).max(500)});
const schema=z.discriminatedUnion('action',[createSchema,anomalySchema,measureSchema,verifySchema,verifyMeterSchema]);
export async function GET() {
  const role=await currentRole(); if(!role) return NextResponse.json({error:'데모 역할을 선택하세요.'},{status:401});
  try {const [data,energy]=await Promise.all([readDemo(),readEnergy(role)]);
   const alerts=energy.mode==='demo'?data.anomalies.filter(x=>!x.id.startsWith('daily:')):detectDailyElectricity(energy.readings,energy.source).map(event=>({...event,status:data.anomalies.find(saved=>saved.id===event.id)?.status??event.status}));
   const measures=data.measures.filter(x=>canAccess(role,x.siteId)&&(x.dataSource??'simulation')===energy.source);const ids=new Set(measures.map(x=>x.id));
   return NextResponse.json({anomalies:alerts.filter(x=>canAccess(role,x.siteId)),measures,verifications:data.verifications.filter(x=>canAccess(role,x.siteId)&&ids.has(x.measureId)&&(x.dataSource??'simulation')===energy.source),audits:role==='admin'||role==='auditor'?data.audits:[]});
  }catch(error){console.error('Workflow data unavailable',error);return NextResponse.json({error:'업무 데이터를 불러오지 못했습니다.'},{status:503});}
}
export async function POST(request:Request) {
  const role=await currentRole(); if(!role) return NextResponse.json({error:'데모 역할을 선택하세요.'},{status:401});
  if(!sameOrigin(request)||!roles[role].write) return NextResponse.json({error:'수정 권한이 없습니다.'},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success) return NextResponse.json({error:'입력값을 확인하세요.'},{status:400});
  const input=parsed.data;
  try {
    const energyData=await readEnergy(role);
    const generated=input.action==='updateAnomaly'&&input.id.startsWith('daily:')?detectDailyElectricity(energyData.readings,energyData.source).find(event=>event.id===input.id):undefined;
    const result=await mutateDemo<unknown>(role,input.action,data=>{
      if(input.action==='createMeasure') {
        if(!canAccess(role,input.siteId)) throw new Error('NOT_FOUND');
        const item={id:randomUUID(),siteId:input.siteId,title:input.title,owner:input.owner,status:'발굴',expected:input.expected,verified:null,note:'등록된 예상 절감액 · 검증 전',dataSource:energyData.source};
        data.measures.push(item); return {result:item,entityId:item.id,before:null,after:item};
      }
      if(input.action==='updateAnomaly') {
        if(input.id.startsWith('daily:')&&!generated)throw new Error('NOT_FOUND');if(!input.id.startsWith('daily:')&&energyData.mode!=='demo')throw new Error('NOT_FOUND');
        let item=data.anomalies.find(x=>x.id===input.id && canAccess(role,x.siteId)); if(!item&&generated&&canAccess(role,generated.siteId)){item=generated;data.anomalies.push(item);} if(!item) throw new Error('NOT_FOUND');
        const before=structuredClone(item); item.status=input.status;
        return {result:item,entityId:item.id,before,after:{...item,reason:input.reason}};
      }
      if(input.action==='verify') {
        const measure=data.measures.find(x=>x.id===input.measureId && canAccess(role,x.siteId)&&(x.dataSource??'simulation')===energyData.source); if(!measure) throw new Error('NOT_FOUND');
        const params=verificationInput.parse(input);
        const item={...params,...verify(params),id:randomUUID(),siteId:measure.siteId,dataSource:energyData.source}; data.verifications.push(item);
        return {result:item,entityId:item.id,before:null,after:item};
      }
      if(input.action==='verifyMeter') {
        const measure=data.measures.find(x=>x.id===input.measureId && canAccess(role,x.siteId)&&(x.dataSource??'simulation')===energyData.source);if(!measure||measure.siteId!=='pyeongtaek')throw new Error('NOT_FOUND');
        const periods=compareDailyPeriods(energyData.readings,measure.siteId,input.baselineStart,input.baselineEnd,input.actualStart,input.actualEnd);
        const params={measureId:input.measureId,baseline:periods.baseline,actual:periods.actual,adjustment:0,energy:'electricity' as const,method:'단순 기준선' as const,note:input.note};
        const item={...params,...verify(params),id:randomUUID(),siteId:measure.siteId,baselineStart:input.baselineStart,baselineEnd:input.baselineEnd,actualStart:input.actualStart,actualEnd:input.actualEnd,dataSource:energyData.source};
        data.verifications.push(item);return {result:item,entityId:item.id,before:null,after:item};
      }
      const item=data.measures.find(x=>x.id===input.id && canAccess(role,x.siteId)&&(x.dataSource??'simulation')===energyData.source); if(!item) throw new Error('NOT_FOUND');
      const before=structuredClone(item); item.status=input.status;
      return {result:item,entityId:item.id,before,after:item};
    }); return NextResponse.json({data:result});
  } catch(error) { if(error instanceof Error && error.message==='NOT_FOUND') return NextResponse.json({error:'항목을 찾을 수 없습니다.'},{status:404}); if(error instanceof Error && (error.message.includes('기준선')||error.message.includes('기간')||error.message.includes('날짜')||error.message.includes('데이터가 없거나'))) return NextResponse.json({error:error.message},{status:400}); console.error('demo workflow failed',error); return NextResponse.json({error:'저장에 실패했습니다.'},{status:500}); }
}
