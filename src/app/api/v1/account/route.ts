import { NextResponse } from 'next/server';
import { z } from 'zod';
import { changePassword, currentAccount, login, sessionValue } from '@/server/account/account';
import { encodeRole, sameOrigin } from '@/server/demo/auth';
const cookieOptions={httpOnly:true,sameSite:'strict' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:8*60*60};
const credentials=z.object({username:z.string().min(1).max(100),password:z.string().min(1).max(128)});
const passwordChange=z.object({currentPassword:z.string().min(1).max(128),newPassword:z.string().min(10).max(128)});
export async function GET(){const account=await currentAccount();return NextResponse.json({user:account?{username:account.username}:null},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'요청 출처가 올바르지 않습니다.'},{status:403});
 const body=credentials.safeParse(await request.json().catch(()=>null));if(!body.success)return NextResponse.json({error:'아이디와 비밀번호를 확인해 주세요.'},{status:400});
 const result=await login(body.data.username,body.data.password);if(result.blocked)return NextResponse.json({error:'로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.'},{status:429});
 if(!result.account)return NextResponse.json({error:'아이디 또는 비밀번호가 올바르지 않습니다.'},{status:401});
 const response=NextResponse.json({user:{username:result.account.username}});response.cookies.set('ems-account',sessionValue(result.account.version),cookieOptions);response.cookies.set('ems-demo',encodeRole('admin'),cookieOptions);return response;
}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'요청 출처가 올바르지 않습니다.'},{status:403});
 const account=await currentAccount();if(!account)return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 const body=passwordChange.safeParse(await request.json().catch(()=>null));if(!body.success)return NextResponse.json({error:'새 비밀번호는 10자 이상 128자 이하여야 합니다.'},{status:400});
 if(body.data.currentPassword===body.data.newPassword)return NextResponse.json({error:'현재 비밀번호와 다른 비밀번호를 입력해 주세요.'},{status:400});
 const changed=await changePassword(account.username,body.data.currentPassword,body.data.newPassword);if(!changed)return NextResponse.json({error:'현재 비밀번호가 올바르지 않습니다.'},{status:401});
 const response=NextResponse.json({message:'비밀번호가 변경되었습니다.'});response.cookies.set('ems-account',sessionValue(changed.version),cookieOptions);return response;
}
export async function DELETE(request:Request){if(!sameOrigin(request))return NextResponse.json({error:'요청 출처가 올바르지 않습니다.'},{status:403});const response=NextResponse.json({ok:true});response.cookies.delete('ems-account');response.cookies.delete('ems-demo');return response;}
