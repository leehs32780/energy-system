import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export type Role = 'admin'|'energy'|'facility'|'esg'|'executive'|'auditor';
export const roles:Record<Role,{label:string;sites:string[]|'all';write:boolean}> = {
  admin:{label:'시스템 관리자',sites:'all',write:true}, energy:{label:'에너지 관리자',sites:'all',write:true},
  facility:{label:'시설 관리자',sites:['pyeongtaek'],write:true}, esg:{label:'ESG 담당자',sites:'all',write:false},
  executive:{label:'경영진',sites:'all',write:false}, auditor:{label:'감사자',sites:'all',write:false},
};
// Process-local signatures deliberately expire on restart. Demo sessions are not production authentication.
const globalSecrets=globalThis as typeof globalThis & { emsDemoSecret?: Buffer };
const secret=globalSecrets.emsDemoSecret ??= randomBytes(32);
const sign=(role:string)=>createHmac('sha256',secret).update(role).digest('hex');
export function encodeRole(role:Role) { return `${role}.${sign(role)}`; }
export async function currentRole():Promise<Role|null> {
  if(process.env.NODE_ENV==='production' && process.env.ENABLE_DEMO_AUTH!=='true') return null;
  const value=(await cookies()).get('ems-demo')?.value;
  if(!value) return null;
  const [role,signature]=value.split('.');
  if(!Object.hasOwn(roles,role) || !signature || !/^[a-f0-9]{64}$/.test(signature)) return null;
  if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(role),'hex'))) return null;
  return role as Role;
}
export function canAccess(role:Role,siteId:string) { const permitted=roles[role].sites; return permitted==='all'||permitted.includes(siteId); }
export function sameOrigin(request:Request) { const origin=request.headers.get('origin'); return !origin || origin===new URL(request.url).origin; }
