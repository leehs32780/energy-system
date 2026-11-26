const DAY=86400000;
export function todaySeoul(now=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=(type:string)=>parts.find(part=>part.type===type)?.value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
export function recentRange(days:number,now=new Date()):{from:string;to:string}{
 const to=todaySeoul(now);const ms=Date.parse(`${to}T00:00:00Z`);
 return {from:new Date(ms-(days-1)*DAY).toISOString().slice(0,10),to};
}
