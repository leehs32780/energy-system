import { test, expect } from '@playwright/test';
import { recentRange } from '../../src/shared/lib/dates';
test('demo workflow shows role and limits read-only writes', async ({ page })=>{
 await page.goto('/');
 await page.getByLabel('아이디').fill('test-admin');
 await page.getByLabel('비밀번호',{exact:true}).fill('test-password-123');
 await page.getByRole('button',{name:'로그인',exact:true}).click();
 await expect(page.getByRole('heading',{name:'개요 대시보드'})).toBeVisible();
 await page.getByRole('button',{name:'절감 조치 관리'}).click();
 await page.getByLabel('데모 역할 선택').selectOption('executive');
 await expect(page.getByText('선택한 역할은 읽기 전용입니다.')).toBeVisible();
});
test('workflow changes are reflected in the dashboard', async ({page})=>{
 await page.goto('/');await page.getByLabel('아이디').fill('test-admin');await page.getByLabel('비밀번호',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'로그인',exact:true}).click();
 await page.getByRole('button',{name:'절감 조치 관리'}).click();
 await page.getByLabel('조치 제목').fill('테스트 절감 조치');await page.getByLabel('담당자',{exact:true}).fill('담당자');await page.getByLabel('예상 연간 절감액 (원)').fill('1000');await page.getByRole('button',{name:'조치 등록'}).click();
 await expect(page.getByText('저장되었습니다.',{exact:false})).toBeVisible();
 await expect(page.getByRole('cell',{name:'테스트 절감 조치'}).first()).toBeVisible();
 await page.getByRole('button',{name:'개요 대시보드'}).click();await page.getByRole('button',{name:'절감 조치 관리'}).click();
 await expect(page.getByRole('cell',{name:'테스트 절감 조치'}).first()).toBeVisible();
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
 const energy=await request.get('/api/v1/energy');expect(energy.ok()).toBeTruthy();const data=await energy.json() as {readings:{siteId:string}[]};expect(data.readings.length).toBeGreaterThan(0);expect(data.readings.every(row=>row.siteId==='pyeongtaek')).toBeTruthy();
});
test('validated CSV preview, period calculation and report use the permitted data', async ({request})=>{
 await request.post('/api/v1/account',{data:{username:'test-admin',password:'test-password-123'}});
 const preview=await request.post('/api/v1/energy/import',{data:{action:'preview',csv:'date,value\n2024-02-29,100\n2024-02-30,42'}});expect(preview.ok()).toBeTruthy();const checked=await preview.json() as {valid:number;errors:unknown[]};expect(checked.valid).toBe(1);expect(checked.errors).toHaveLength(1);
 const {from,to}=recentRange(14);const start=new Date(`${from}T00:00:00Z`).getTime();const day=86400000;const date=(offset:number)=>new Date(start+offset*day).toISOString().slice(0,10);
 const verification=await request.post('/api/v1/workflow',{data:{action:'verifyMeter',measureId:'m1',baselineStart:from,baselineEnd:date(6),actualStart:date(7),actualEnd:to,note:'일별 자료 비교'}});expect(verification.ok()).toBeTruthy();const result=await verification.json() as {data:{dataSource:string;baseline:number;actual:number}};expect(result.data.dataSource).toBe('simulation');expect(result.data.baseline).toBeGreaterThan(0);expect(result.data.actual).toBeGreaterThan(0);
 const report=await request.get('/api/v1/reports/energy?site=pyeongtaek&days=7');expect(report.ok()).toBeTruthy();expect(await report.text()).toContain('평택 제1공장');
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
