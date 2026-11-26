import {todaySeoul} from '@/shared/lib/dates';
export type DailyImportRow={date:string;value:number};
export type ImportIssue={line:number;message:string};
export function dailyCoverage(dates:string[],from:string,to:string){
 const start=Date.parse(`${from}T00:00:00Z`),end=Date.parse(`${to}T00:00:00Z`);
 const expected=Math.floor((end-start)/86400000)+1;
 const observed=new Set(dates.filter(date=>date>=from&&date<=to)).size;
 return {expected,observed,missing:Math.max(0,expected-observed)};
}
export function parseDailyElectricityCsv(text:string,today=todaySeoul()):{rows:DailyImportRow[];errors:ImportIssue[]}{
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);const errors:ImportIssue[]=[];const rows:DailyImportRow[]=[];const dates=new Set<string>();
 if(lines[0]?.trim().toLowerCase()!=='date,value')return {rows,errors:[{line:1,message:'첫 줄은 date,value 형식이어야 합니다.'}]};
 if(lines.length>2002)return {rows,errors:[{line:1,message:'한 번에 최대 2,000개 행만 처리할 수 있습니다.'}]};
 lines.slice(1).forEach((line,index)=>{
  if(!line.trim())return; const columns=line.split(',');const date=columns[0]?.trim();const raw=columns[1]?.trim();
  if(columns.length!==2||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')){errors.push({line:index+2,message:'날짜와 사용량을 date,value 형식으로 입력하세요.'});return;}
  const parsed=new Date(`${date}T00:00:00.000Z`);if(Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==date){errors.push({line:index+2,message:'유효하지 않은 날짜입니다.'});return;}
  if(date>today){errors.push({line:index+2,message:'미래 날짜의 사용량은 가져올 수 없습니다.'});return;}
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(raw||'')||Number(raw)>1e12){errors.push({line:index+2,message:'사용량은 0 이상의 숫자이며 소수점 6자리 이하여야 합니다.'});return;}
  if(dates.has(date)){errors.push({line:index+2,message:'파일 안에 중복된 날짜가 있습니다.'});return;}
  dates.add(date);rows.push({date,value:Number(raw)});
 });
 if(!rows.length&&!errors.length)errors.push({line:1,message:'가져올 데이터가 없습니다.'});
 return {rows,errors};
}
