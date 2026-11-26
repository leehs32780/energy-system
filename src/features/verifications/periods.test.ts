import {describe,expect,it} from 'vitest';
import type {Reading} from '@/features/energy/model';
import {compareDailyPeriods} from './periods';
function rows():Reading[]{return Array.from({length:14},(_,i)=>({siteId:'pyeongtaek',energy:'electricity',date:new Date(Date.UTC(2024,1,23+i)).toISOString().slice(0,10),value:i<7?100:80,quality:'normal'}));}
describe('daily measurement and verification',()=>{
 it('uses all days across leap-day periods',()=>{const result=compareDailyPeriods(rows(),'pyeongtaek','2024-02-23','2024-02-29','2024-03-01','2024-03-07');expect(result.baseline).toBe(700);expect(result.actual).toBe(560);});
 it('rejects overlapping, unequal and incomplete periods',()=>{expect(()=>compareDailyPeriods(rows(),'pyeongtaek','2024-02-23','2024-02-29','2024-02-29','2024-03-06')).toThrow();expect(()=>compareDailyPeriods(rows().slice(1),'pyeongtaek','2024-02-23','2024-02-29','2024-03-01','2024-03-07')).toThrow();});
 it('rejects duplicate daily readings',()=>{const data=rows();expect(()=>compareDailyPeriods([...data,data[0]],'pyeongtaek','2024-02-23','2024-02-29','2024-03-01','2024-03-07')).toThrow();});
});
