import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:true,workers:2,timeout:30_000,
 use:{baseURL:process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:5173',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'},
 reporter:[['list'],['html',{open:'never'}]],
 ...(!process.env.PLAYWRIGHT_BASE_URL?{webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:true}}:{}),
});
