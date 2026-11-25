import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { anomalies, type Anomaly } from '@/features/anomalies/model';
import { measures, type Measure } from '@/features/measures/model';
import type { Verification } from '@/features/verifications/model';

export type Audit = { id:string; at:string; actor:string; action:string; entityId:string; before:unknown; after:unknown };
export type DemoData = { anomalies:Anomaly[]; measures:Measure[]; audits:Audit[]; verifications:Verification[] };
const directory = path.join(process.cwd(), '.data');
const filename = path.join(directory, 'demo.json');
let queue: Promise<unknown> = Promise.resolve();
async function load(): Promise<DemoData> {
  try { const data=JSON.parse(await readFile(filename,'utf8')) as DemoData; return {...data,verifications:data.verifications ?? []}; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return {anomalies:structuredClone(anomalies),measures:structuredClone(measures),audits:[],verifications:[]};
  }
}
export async function readDemo():Promise<DemoData> { await queue; return load(); }
export async function mutateDemo<T>(actor:string, action:string, update:(data:DemoData)=>{result:T;entityId:string;before:unknown;after:unknown}):Promise<T> {
  const operation=queue.then(async()=>{
    const data=await load(); const changed=update(data);
    data.audits.push({id:randomUUID(),at:new Date().toISOString(),actor,action,entityId:changed.entityId,before:changed.before,after:changed.after});
    await mkdir(directory,{recursive:true});
    const temporary=path.join(directory,`demo-${randomUUID()}.tmp`);
    await writeFile(temporary,JSON.stringify(data,null,2),'utf8');
    await rename(temporary,filename);
    return changed.result;
  });
  queue=operation.catch(()=>undefined);
  return operation;
}
