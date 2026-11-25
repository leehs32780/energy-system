import {describe,expect,it} from 'vitest';
import {parseDailyElectricityCsv} from './import';
describe('daily electricity CSV',()=>{
 it('accepts BOM and leap day',()=>expect(parseDailyElectricityCsv('\uFEFFdate,value\n2024-02-29,12.25\n').rows).toEqual([{date:'2024-02-29',value:12.25}]));
 it('rejects invalid dates, negatives and duplicates',()=>expect(parseDailyElectricityCsv('date,value\n2025-02-29,1\n2025-02-28,-1\n2025-03-01,2\n2025-03-01,3').errors).toHaveLength(3));
 it('requires a fixed header and rejects formulas',()=>{expect(parseDailyElectricityCsv('날짜,값\n2025-01-01,1').errors).toHaveLength(1);expect(parseDailyElectricityCsv('date,value\n2025-01-01,=1+1').errors).toHaveLength(1);});
});
