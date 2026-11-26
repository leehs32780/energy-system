import {describe,expect,it} from 'vitest';
import {verify} from './model';

describe('verification assumptions',()=>{
 it('stores the rate and reports an unknown water emissions factor',()=>{
  const result=verify({measureId:'measure',baseline:100,actual:80,adjustment:0,energy:'water',method:'단순 기준선',note:''});
  expect(result.cost).toBe(24000);
  expect(result.carbon).toBeNull();
  expect(result.assumptions).toMatchObject({rate:1200,carbonFactor:null,version:'demo-1'});
 });
});
