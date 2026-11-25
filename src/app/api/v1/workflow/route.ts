import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { canAccess, currentRole, roles, sameOrigin } from '@/server/demo/auth';
import { mutateDemo, readDemo } from '@/server/demo/store';
import { verificationInput, verify } from '@/features/verifications/model';
const createSchema=z.object({action:z.literal('createMeasure'),title:z.string().trim().min(2).max(120),siteId:z.enum(['pyeongtaek','incheon','seoul']),owner:z.string().trim().min(1).max(60),expected:z.number().finite().nonnegative().max(1e12)});
const anomalySchema=z.object({action:z.literal('updateAnomaly'),id:z.string().min(1).max(100),status:z.enum(['신규','검토 중','조치 계획','조치 진행','효과 검증','해결','오탐','보류']),reason:z.string().trim().min(2).max(500)});
const measureSchema=z.object({action:z.literal('updateMeasure'),id:z.string().min(1).max(100),status:z.enum(['발굴','검토/승인 대기','계획됨','진행 중','검증 대기','완료','중단'])});
const verifySchema=verificationInput.extend({action:z.literal('verify')});
const schema=z.discriminatedUnion('action',[createSchema,anomalySchema,measureSchema,verifySchema]);
export async function GET() {
  const role=await currentRole(); if(!role) return NextResponse.json({error:'데모 역할을 선택하세요.'},{status:401});
  const data=await readDemo(); return NextResponse.json({anomalies:data.anomalies.filter(x=>canAccess(role,x.siteId)),measures:data.measures.filter(x=>canAccess(role,x.siteId)),verifications:data.verifications.filter(x=>canAccess(role,x.siteId)),audits:role==='admin'||role==='auditor'?data.audits:[]});
}
export async function POST(request:Request) {
  const role=await currentRole(); if(!role) return NextResponse.json({error:'데모 역할을 선택하세요.'},{status:401});
  if(!sameOrigin(request)||!roles[role].write) return NextResponse.json({error:'수정 권한이 없습니다.'},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success) return NextResponse.json({error:'입력값을 확인하세요.'},{status:400});
  const input=parsed.data;
  try {
    const result=await mutateDemo<unknown>(role,input.action,data=>{
      if(input.action==='createMeasure') {
        if(!canAccess(role,input.siteId)) throw new Error('NOT_FOUND');
        const item={id:randomUUID(),siteId:input.siteId,title:input.title,owner:input.owner,status:'발굴',expected:input.expected,verified:null,note:'등록된 예상 절감액 · 검증 전'};
        data.measures.push(item); return {result:item,entityId:item.id,before:null,after:item};
      }
      if(input.action==='updateAnomaly') {
        const item=data.anomalies.find(x=>x.id===input.id && canAccess(role,x.siteId)); if(!item) throw new Error('NOT_FOUND');
        const before=structuredClone(item); item.status=input.status;
        return {result:item,entityId:item.id,before,after:{...item,reason:input.reason}};
      }
      if(input.action==='verify') {
        const measure=data.measures.find(x=>x.id===input.measureId && canAccess(role,x.siteId)); if(!measure) throw new Error('NOT_FOUND');
        const params=verificationInput.parse(input);
        const item={...params,...verify(params),id:randomUUID(),siteId:measure.siteId}; data.verifications.push(item);
        return {result:item,entityId:item.id,before:null,after:item};
      }
      const item=data.measures.find(x=>x.id===input.id && canAccess(role,x.siteId)); if(!item) throw new Error('NOT_FOUND');
      const before=structuredClone(item); item.status=input.status;
      return {result:item,entityId:item.id,before,after:item};
    }); return NextResponse.json({data:result});
  } catch(error) { if(error instanceof Error && error.message==='NOT_FOUND') return NextResponse.json({error:'항목을 찾을 수 없습니다.'},{status:404}); if(error instanceof Error && error.message.includes('기준선')) return NextResponse.json({error:error.message},{status:400}); console.error('demo workflow failed',error); return NextResponse.json({error:'저장에 실패했습니다.'},{status:500}); }
}
