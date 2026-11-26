import { NextResponse } from 'next/server';
import { currentRole } from '@/server/demo/auth';
import { readEnergy } from '@/server/energy/repository';

export async function GET(){
 const role=await currentRole();if(!role)return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 try {return NextResponse.json(await readEnergy(role),{headers:{'Cache-Control':'no-store'}});}
 catch(error){console.error('Energy data unavailable',error);return NextResponse.json({error:'에너지 데이터를 불러오지 못했습니다. 데이터베이스 연결을 확인하세요.'},{status:503});}
}
