import 'server-only';
import { PrismaClient } from '@prisma/client';
import { demoReadings, sites, type Energy, type Reading, type Site } from '@/features/energy/model';
import { canAccess, type Role } from '@/server/demo/auth';
import type { DailyImportRow } from '@/features/energy/import';
import { recentRange } from '@/shared/lib/dates';

const seededSiteIds:Record<string,string>={pyeongtaek:'22222222-2222-4222-8222-222222222221',incheon:'22222222-2222-4222-8222-222222222222',seoul:'22222222-2222-4222-8222-222222222223'};
const globalDb=globalThis as typeof globalThis & {emsPrisma?:PrismaClient};
function db(){return globalDb.emsPrisma ??= new PrismaClient();}
export async function importPyeongtaekElectricity(rows:DailyImportRow[]){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_REQUIRED');
 // Imported data uses a separate meter so simulated seed records never suppress real uploads.
 const meterId='33333333-3333-4333-8333-000000000010';
 const meter=await db().meter.findUnique({where:{id:meterId},select:{siteId:true,energy:true,unit:true,intervalMinutes:true}});
 if(!meter||meter.siteId!==seededSiteIds.pyeongtaek||meter.energy!=='electricity'||meter.unit!=='kWh'||meter.intervalMinutes!==1440)throw new Error('METER_REQUIRED');
 const result=await db().meterReading.createMany({data:rows.map(row=>({meterId,observedAt:new Date(`${row.date}T00:00:00.000Z`),intervalMinutes:1440,value:row.value,unit:'kWh',readingType:'interval',quality:'normal',source:'csv-import'})),skipDuplicates:true});
 return {imported:result.count,duplicates:rows.length-result.count};
}
export async function readEnergy(role:Role):Promise<{readings:Reading[];sites:Site[];mode:'demo'|'database';source:'simulation'|'demo-seed'|'csv-import'}>{
 const permitted=sites.filter(site=>canAccess(role,site.id));
 if(!process.env.DATABASE_URL) return {readings:demoReadings().filter(reading=>canAccess(role,reading.siteId)),sites:permitted,mode:'demo',source:'simulation'};
 const ids=permitted.map(site=>seededSiteIds[site.id]);
 const since=new Date(`${recentRange(400).from}T00:00:00Z`);
 const source=process.env.EMS_READING_SOURCE==='demo-seed'?'demo-seed':'csv-import';
 const rows=await db().meterReading.findMany({where:{source,readingType:'interval',intervalMinutes:1440,observedAt:{gte:since},meter:{siteId:{in:ids}}},select:{observedAt:true,value:true,unit:true,quality:true,meter:{select:{siteId:true,energy:true,unit:true}}},orderBy:{observedAt:'asc'},take:50001});
 if(rows.length>50000)throw new Error('데이터 범위가 너무 큽니다.');
 const readings:Reading[]=rows.flatMap(row=>{
  const siteId=permitted.find(site=>seededSiteIds[site.id]===row.meter.siteId)?.id;
  const energy=row.meter.energy;
  if(!siteId || !(['electricity','gas','water'] as string[]).includes(energy))return [];
  const quality=row.quality==='normal'&&row.unit===row.meter.unit?'normal':'missing';
  return [{siteId,date:row.observedAt.toISOString().slice(0,10),energy:energy as Energy,value:Number(row.value),quality}];
 });
 return {readings,sites:permitted,mode:'database',source};
}
