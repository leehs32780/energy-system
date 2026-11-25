/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const orgId='11111111-1111-4111-8111-111111111111';
const demoSites=[
  {id:'22222222-2222-4222-8222-222222222221',name:'평택 제1공장',area:42800},
  {id:'22222222-2222-4222-8222-222222222222',name:'인천 물류센터',area:18600},
  {id:'22222222-2222-4222-8222-222222222223',name:'서울 본사',area:12400},
];
async function main(){
 await prisma.organization.upsert({where:{id:orgId},update:{},create:{id:orgId,name:'에코넥스 제조'}});
 for (let i=0;i<demoSites.length;i++) {
  const site=demoSites[i]; await prisma.site.upsert({where:{id:site.id},update:{},create:{...site,organizationId:orgId}});
  for (let j=0;j<3;j++) {
   const energy=['electricity','gas','water'][j]; const unit=['kWh','Nm³','m³'][j];
   const id=`33333333-3333-4333-8333-${String(i*3+j+1).padStart(12,'0')}`;
   await prisma.meter.upsert({where:{id},update:{},create:{id,siteId:site.id,name:`${site.name} ${energy} 데모 계량기`,energy,unit,intervalMinutes:1440}});
   const rows=[];const end=new Date();end.setUTCHours(0,0,0,0);
   for(let day=399;day>=0;day--){const date=new Date(end.getTime()-day*86400000);const weekend=[0,6].includes(date.getUTCDay());const season=Math.cos((date.getUTCMonth()-7)*Math.PI/6);const activity=weekend?[0.68,0.88,0.37][i]:1;const base=[[15600,7400,3100],[540,240,150],[350,180,76]][j][i];const seasonal=j===0?1+Math.max(season,0)*0.2:j===1?1+Math.max(-season,0)*0.6:1;rows.push({meterId:id,observedAt:date,intervalMinutes:1440,value:Math.round(base*activity*seasonal*(1+Math.sin(day*.47+i)*.035)),unit,readingType:'interval',quality:day===14&&i===1&&j===2?'missing':'normal',source:'demo-seed'});}
   await prisma.meterReading.createMany({data:rows,skipDuplicates:true});
  }
 }
 console.log('데모 조직, 사업장, 계량기와 일별 데이터를 준비했습니다.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
