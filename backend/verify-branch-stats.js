import dotenv from 'dotenv'; dotenv.config();
import * as branchService from './src/services/branchService.js';
const TAMASHA = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const REEM    = 'd63d73a2-c039-40c7-8a0b-aea168bcfd3b';
const [t, r] = await Promise.all([
  branchService.getBranchWithStats(TAMASHA),
  branchService.getBranchWithStats(REEM)
]);
console.log('Tamasha:', { todaySales: t.todaySales, todayExpenses: t.todayExpenses, profit: t.profit });
console.log('Reem:   ', { todaySales: r.todaySales, todayExpenses: r.todayExpenses, profit: r.profit });
console.log(t.todayExpenses !== undefined && r.todayExpenses !== undefined ? '✅ todayExpenses now present' : '❌ still missing');
