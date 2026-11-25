import 'server-only';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cookies } from 'next/headers';

const scrypt=promisify(scryptCallback);
const directory=process.env.EMS_ACCOUNT_DATA_DIR || path.join(process.cwd(),'.data');
const file=path.join(directory,'account.json');
type Account={username:string;passwordHash:string;version:number};
const globals=globalThis as typeof globalThis & { emsAccountSecret?:Buffer; emsLoginAttempts?:Map<string,{count:number;until:number}> };
const secret=globals.emsAccountSecret ??= randomBytes(32);
const attempts=globals.emsLoginAttempts ??= new Map();
let changeQueue:Promise<unknown>=Promise.resolve();

async function readAccount():Promise<Account|null>{
  try { const data=JSON.parse(await readFile(file,'utf8')) as Account; if(typeof data.username!=='string'||typeof data.passwordHash!=='string'||!Number.isSafeInteger(data.version)) throw new Error('Invalid account file'); return data; }
  catch(error){ if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error; const username=process.env.EMS_USERNAME;const passwordHash=process.env.EMS_INITIAL_PASSWORD_HASH;return username&&passwordHash?{username,passwordHash,version:1}:null; }
}
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64) as Buffer;return `${salt}:${hash.toString('hex')}`;}
async function matches(password:string,encoded:string){const [salt,hex]=encoded.split(':');if(!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{128}$/.test(hex||'')) return false;const actual=await scrypt(password,salt,64) as Buffer;return timingSafeEqual(actual,Buffer.from(hex,'hex'));}
const signature=(payload:string)=>createHmac('sha256',secret).update(payload).digest('hex');
export function sessionValue(version:number){const payload=`${version}.${Date.now()+8*60*60*1000}`;return `${payload}.${signature(payload)}`;}
export async function currentAccount(){
 const value=(await cookies()).get('ems-account')?.value; if(!value) return null;
 const [version,expiry,signatureHex,...rest]=value.split('.');if(rest.length||!/^\d+$/.test(version||'')||!/^\d+$/.test(expiry||'')||!/^[a-f0-9]{64}$/.test(signatureHex||''))return null;
 const payload=`${version}.${expiry}`;if(!timingSafeEqual(Buffer.from(signatureHex,'hex'),Buffer.from(signature(payload),'hex'))||Number(expiry)<Date.now())return null;
 const account=await readAccount();return account&&account.version===Number(version)?{username:account.username,version:account.version}:null;
}
export async function login(username:string,password:string){
 const key=username.toLowerCase().slice(0,100);const attempt=attempts.get(key);if(attempt&&attempt.until>Date.now()&&attempt.count>=5)return {blocked:true,account:null};
 const account=await readAccount();const valid=account&&username===account.username&&await matches(password,account.passwordHash);
 if(!valid){const previous=attempt&&attempt.until>Date.now()?attempt.count:0; attempts.set(key,{count:previous+1,until:Date.now()+15*60*1000});return {blocked:false,account:null};}
 attempts.delete(key);return {blocked:false,account:{username:account.username,version:account.version}};
}
export async function changePassword(username:string,oldPassword:string,newPassword:string){
 const op=changeQueue.then(async()=>{const account=await readAccount();if(!account||account.username!==username||!await matches(oldPassword,account.passwordHash))return null;
  const updated={...account,passwordHash:await hashPassword(newPassword),version:account.version+1};
  await mkdir(directory,{recursive:true});const temp=path.join(directory,`account-${randomBytes(12).toString('hex')}.tmp`);await writeFile(temp,JSON.stringify(updated),{encoding:'utf8',mode:0o600});await rename(temp,file);return {username:updated.username,version:updated.version};});
 changeQueue=op.catch(()=>undefined);return op;
}
