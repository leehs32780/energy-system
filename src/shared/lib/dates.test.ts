import {describe,expect,it} from 'vitest';
import {recentRange} from './dates';
describe('Korean calendar range',()=>{it('uses Seoul day boundary and counts calendar days',()=>{expect(recentRange(7,new Date('2024-02-29T15:30:00Z'))).toEqual({from:'2024-02-24',to:'2024-03-01'});});});
