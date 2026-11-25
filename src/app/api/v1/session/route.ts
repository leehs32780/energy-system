import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentRole, encodeRole, roles, sameOrigin, type Role } from '@/server/demo/auth';
export async function GET() { const role=await currentRole(); return NextResponse.json({role,profile:role?roles[role]:null}); }
export async function POST(request:Request) {
  if(!sameOrigin(request)) return NextResponse.json({error:'요청 출처가 올바르지 않습니다.'},{status:403});
  if(process.env.NODE_ENV==='production' && process.env.ENABLE_DEMO_AUTH!=='true') return NextResponse.json({error:'데모 인증이 비활성화되어 있습니다.'},{status:403});
  const body=await request.json().catch(()=>null); const parsed=z.object({role:z.enum(['admin','energy','facility','esg','executive','auditor'])}).safeParse(body);
  if(!parsed.success) return NextResponse.json({error:'역할을 확인하세요.'},{status:400});
  const role=parsed.data.role as Role; const response=NextResponse.json({role,profile:roles[role]});
  response.cookies.set('ems-demo',encodeRole(role),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:28800});
  return response;
}
