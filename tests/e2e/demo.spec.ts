import { test, expect } from '@playwright/test';
test('demo workflow shows role and limits read-only writes', async ({ page })=>{
 await page.goto('/');
 await page.getByLabel('아이디').fill('test-admin');
 await page.getByLabel('비밀번호',{exact:true}).fill('test-password-123');
 await page.getByRole('button',{name:'로그인',exact:true}).click();
 await expect(page.getByRole('heading',{name:'개요 대시보드'})).toBeVisible();
 await page.getByLabel('데모 역할 선택').selectOption('executive');
 await expect(page.getByText('선택한 역할은 읽기 전용입니다.')).toBeVisible();
});
test('server denies write actions to executive', async ({request})=>{
 await request.post('/api/v1/account',{data:{username:'test-admin',password:'test-password-123'}});
 const session=await request.post('/api/v1/session',{data:{role:'executive'}}); expect(session.ok()).toBeTruthy();
 const response=await request.post('/api/v1/workflow',{data:{action:'createMeasure',title:'시험 조치',siteId:'pyeongtaek',owner:'담당자',expected:100}});
 expect(response.status()).toBe(403);
});
test('facility role cannot modify another site', async ({request})=>{
 await request.post('/api/v1/account',{data:{username:'test-admin',password:'test-password-123'}});
 await request.post('/api/v1/session',{data:{role:'facility'}});
 const response=await request.post('/api/v1/workflow',{data:{action:'updateAnomaly',id:'a2',status:'검토 중',reason:'권한 검사'}});
 expect(response.status()).toBe(404);
});
test('login, password change and logout', async ({page,request})=>{
 const rejected=await request.post('/api/v1/account',{data:{username:'test-admin',password:'incorrect'}});expect(rejected.status()).toBe(401);
 await page.goto('/'); await page.getByLabel('아이디').fill('test-admin'); await page.getByLabel('비밀번호',{exact:true}).fill('test-password-123'); await page.getByRole('button',{name:'로그인',exact:true}).click();
 await page.getByRole('button',{name:'마이페이지'}).click();
 await page.getByLabel('현재 비밀번호').fill('test-password-123');await page.getByLabel('새 비밀번호',{exact:true}).fill('changed-password-456');await page.getByLabel('새 비밀번호 확인').fill('changed-password-456');
 await page.getByRole('button',{name:'비밀번호 변경'}).click();await expect(page.getByText('비밀번호가 변경되었습니다.',{exact:false})).toBeVisible();
 const oldLogin=await request.post('/api/v1/account',{data:{username:'test-admin',password:'test-password-123'}});expect(oldLogin.status()).toBe(401);
 await page.getByRole('button',{name:'닫기',exact:true}).first().click(); await page.getByRole('button',{name:'로그아웃'}).click();
 await expect(page.getByRole('heading',{name:'관리자 로그인'})).toBeVisible();
 await page.getByLabel('아이디').fill('test-admin');await page.getByLabel('비밀번호',{exact:true}).fill('changed-password-456');await page.getByRole('button',{name:'로그인',exact:true}).click();await expect(page.getByRole('button',{name:'마이페이지'})).toBeVisible();
});
