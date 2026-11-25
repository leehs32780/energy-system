import { test, expect } from '@playwright/test';
test('demo workflow shows role and limits read-only writes', async ({ page })=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'개요 대시보드'})).toBeVisible();
 await page.getByLabel('데모 역할 선택').selectOption('executive');
 await expect(page.getByText('선택한 역할은 읽기 전용입니다.')).toBeVisible();
});
test('server denies write actions to executive', async ({request})=>{
 const session=await request.post('/api/v1/session',{data:{role:'executive'}}); expect(session.ok()).toBeTruthy();
 const response=await request.post('/api/v1/workflow',{data:{action:'createMeasure',title:'시험 조치',siteId:'pyeongtaek',owner:'담당자',expected:100}});
 expect(response.status()).toBe(403);
});
test('facility role cannot modify another site', async ({request})=>{
 await request.post('/api/v1/session',{data:{role:'facility'}});
 const response=await request.post('/api/v1/workflow',{data:{action:'updateAnomaly',id:'a2',status:'검토 중',reason:'권한 검사'}});
 expect(response.status()).toBe(404);
});
