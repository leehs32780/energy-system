import { z } from 'zod';
import { calculateSavings, calculateCost, calculateCarbon } from '@/features/energy/calculations';
import { energyInfo } from '@/features/energy/model';
export const verificationInput = z.object({
  measureId:z.string().min(1).max(100), baseline:z.number().finite().positive().max(1e12), actual:z.number().finite().nonnegative().max(1e12), adjustment:z.number().finite().min(-1e12).max(1e12),
  energy:z.enum(['electricity','gas','water']), method:z.enum(['단순 기준선','직전 기간','전년 동기','동일 요일']), note:z.string().trim().max(500),
});
export type VerificationInput=z.infer<typeof verificationInput>;
export function verify(input:VerificationInput) {
  const savings=calculateSavings(input.baseline,input.actual,input.adjustment);
  return {...savings,cost:calculateCost(input.energy,savings.quantity),carbon:calculateCarbon(input.energy,savings.quantity), assumptions:{rate:energyInfo[input.energy].rate,carbonFactor:input.energy==='water'?null:energyInfo[input.energy].factor,source:'데모 계수',version:'demo-1'}, status:'추가 관찰 필요' as const,version:'1',calculatedAt:new Date().toISOString()};
}
export type Verification=VerificationInput & Omit<ReturnType<typeof verify>,'assumptions'> & {assumptions?:ReturnType<typeof verify>['assumptions'];id:string;siteId:string;baselineStart?:string;baselineEnd?:string;actualStart?:string;actualEnd?:string;dataSource?:string};
