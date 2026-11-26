import {describe,expect,it} from 'vitest';
import type {Reading} from '@/features/energy/model';
import {detectDailyElectricity,mergeDailyAlerts} from './daily';
const row=(date:string,value:number,quality:'normal'|'missing'='normal'):Reading=>({siteId:'pyeongtaek',energy:'electricity',date,value,quality});
describe('weekday electricity detection',()=>{
 const history=['2025-01-06','2025-01-13','2025-01-20','2025-01-27','2025-02-03','2025-02-10','2025-02-17'].map(date=>row(date,100));
 it('detects the latest same weekday deviation with explanation',()=>{const [event]=detectDailyElectricity([...history,row('2025-02-24',150)]);expect(event.id).toBe('daily:simulation:pyeongtaek:2025-02-24');expect(event.reason).toContain('50.0%');});
 it('does not treat insufficient or missing history as an anomaly',()=>{expect(detectDailyElectricity([...history.slice(0,6),row('2025-02-24',200)])).toEqual([]);expect(detectDailyElectricity([...history,row('2025-02-24',200,'missing')])).toEqual([]);});
 it('retains reviewed events while separating data sources',()=>{const [event]=detectDailyElectricity([...history,row('2025-02-24',150)],'csv-import');const reviewed={...event,status:'해결'};expect(mergeDailyAlerts([reviewed],[event],'csv-import')).toEqual([reviewed]);expect(mergeDailyAlerts([reviewed],[],'demo-seed')).toEqual([]);});
});
