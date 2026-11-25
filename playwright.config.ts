import { defineConfig } from '@playwright/test';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const salt=randomBytes(16).toString('hex');
const testHash=`${salt}:${scryptSync('test-password-123',salt,64).toString('hex')}`;
export default defineConfig({testDir:'./tests/e2e',workers:1,use:{baseURL:'http://localhost:3127'},webServer:{command:process.platform==='win32'?'npm.cmd run dev -- --port 3127':'npm run dev -- --port 3127',url:'http://localhost:3127',reuseExistingServer:false,timeout:120000,env:{...process.env,EMS_USERNAME:'test-admin',EMS_INITIAL_PASSWORD_HASH:testHash,EMS_ACCOUNT_DATA_DIR:mkdtempSync(path.join(tmpdir(),'ems-account-test-'))}}});
