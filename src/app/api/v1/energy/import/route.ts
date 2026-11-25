import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentRole, canAccess, roles, sameOrigin } from '@/server/demo/auth';
import { parseDailyElectricityCsv } from '@/features/energy/import';
import { importPyeongtaekElectricity } from '@/server/energy/repository';

const input=z.object({action:z.enum(['preview','import']),csv:z.string().min(1).max(256000)});
export async function POST(request:Request){
 const role=await currentRole();if(!role)return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 if(!sameOrigin(request)||!roles[role].write||!canAccess(role,'pyeongtaek'))return NextResponse.json({error:'가져오기 권한이 없습니다.'},{status:403});
 if(Number(request.headers.get('content-length')||0)>300000)return NextResponse.json({error:'파일 크기가 너무 큽니다.'},{status:413});
 const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'파일 크기와 형식을 확인하세요.'},{status:400});
 const result=parseDailyElectricityCsv(parsed.data.csv);
 if(parsed.data.action==='preview')return NextResponse.json({valid:result.rows.length,errors:result.errors,rows:result.rows.slice(0,10)});
 if(result.errors.length)return NextResponse.json({error:'오류를 수정한 후 다시 가져오세요.',errors:result.errors},{status:400});
 try {return NextResponse.json(await importPyeongtaekElectricity(result.rows));}
 catch(error){if(error instanceof Error&&error.message==='DATABASE_REQUIRED')return NextResponse.json({error:'CSV 가져오기는 PostgreSQL 연결 후 사용할 수 있습니다.'},{status:503});if(error instanceof Error&&error.message==='METER_REQUIRED')return NextResponse.json({error:'평택 일별 전기 계량기 설정을 확인하세요.'},{status:409});console.error('Import failed',error);return NextResponse.json({error:'가져오기에 실패했습니다.'},{status:500});}
}
