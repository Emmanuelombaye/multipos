import cron from 'node-cron';
import { supabase } from '../db/supabase.js';
import { ensureDailyHistory } from './inventoryService.js';
import { reconcileDailyOpeningStock } from './stockReconciliationService.js';

/**
 * AUTOMATED DAILY AUDIT SYSTEM
 * Runs automatically every day to ensure stock accountability
 */

const getKenyaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const getKenyaTime = () => new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Nairobi',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).format(new Date());

/**
 * DAILY AUDIT JOB
 * Runs every day at 6:00 AM EAT (East Africa Time)
 * Creates stock_history records for all branches
 */
async function runDailyAudit() {
  const today = getKenyaDate();
  const time = getKenyaTime();
  
  console.log(`\n🔔 ========================================`);
  console.log(`   DAILY AUDIT STARTED`);
  console.log(`   Date: ${today} | Time: ${time} EAT`);
  console.log(`========================================\n`);

  try {
    // Step 1: Get all branches
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('*');
    
    if (branchError) throw branchError;
    
    console.log(`📍 Processing ${branches.length} branches...\n`);

    let totalRecordsCreated = 0;
    let totalProductsProcessed = 0;

    // Step 2: Create stock_history for each branch
    for (const branch of branches) {
      console.log(`📦 Branch: ${branch.name}`);
      
      const { data: stockData, error: stockError } = await supabase
        .from('branch_stock')
        .select('product_id, current_stock, products(name)')
        .eq('branch_id', branch.id);
      
      if (stockError) {
        console.error(`   ❌ Error fetching stock: ${stockError.message}`);
        continue;
      }

      if (!stockData || stockData.length === 0) {
        console.log(`   ⚠️  No stock found\n`);
        continue;
      }

      let branchRecords = 0;
      for (const stock of stockData) {
        const result = await ensureDailyHistory(stock.product_id, branch.id, today);
        
        if (result) {
          branchRecords++;
          totalRecordsCreated++;
        }
        totalProductsProcessed++;
      }
      
      console.log(`   ✅ Created ${branchRecords} stock history records\n`);
    }

    // Step 3: Run reconciliation to fix any discrepancies
    console.log(`🔄 Running stock reconciliation...\n`);
    const reconResult = await reconcileDailyOpeningStock();
    
    console.log(`   ✅ Reconciliation complete:`);
    console.log(`      Records reconciled: ${reconResult.reconciled}`);
    console.log(`      Message: ${reconResult.message}\n`);

    // Step 4: Generate audit summary
    console.log(`📊 ========================================`);
    console.log(`   DAILY AUDIT SUMMARY`);
    console.log(`========================================`);
    console.log(`✅ Branches processed: ${branches.length}`);
    console.log(`✅ Products processed: ${totalProductsProcessed}`);
    console.log(`✅ Stock history records: ${totalRecordsCreated}`);
    console.log(`✅ Discrepancies fixed: ${reconResult.reconciled}`);
    console.log(`✅ Status: COMPLETE`);
    console.log(`========================================\n`);

    // Step 5: Log audit to database
    await logAuditToDatabase({
      date: today,
      time: time,
      branches_processed: branches.length,
      products_processed: totalProductsProcessed,
      records_created: totalRecordsCreated,
      discrepancies_fixed: reconResult.reconciled,
      status: 'success'
    });

  } catch (error) {
    console.error(`\n❌ DAILY AUDIT FAILED:`);
    console.error(error);
    
    // Log failure to database
    await logAuditToDatabase({
      date: getKenyaDate(),
      time: getKenyaTime(),
      status: 'failed',
      error_message: error.message
    });
  }
}

/**
 * Log audit results to database for tracking
 */
async function logAuditToDatabase(auditData) {
  try {
    const { error } = await supabase
      .from('system_audit_logs')
      .insert({
        audit_type: 'daily_stock_audit',
        audit_date: auditData.date,
        audit_time: auditData.time,
        branches_processed: auditData.branches_processed || 0,
        products_processed: auditData.products_processed || 0,
        records_created: auditData.records_created || 0,
        discrepancies_fixed: auditData.discrepancies_fixed || 0,
        status: auditData.status,
        error_message: auditData.error_message || null,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('⚠️  Failed to log audit to database:', error.message);
    }
  } catch (err) {
    console.error('⚠️  Audit logging error:', err.message);
  }
}

/**
 * HOURLY RECONCILIATION CHECK
 * Runs every hour to catch any mid-day discrepancies
 */
async function runHourlyReconciliation() {
  const time = getKenyaTime();
  console.log(`\n🔄 Hourly reconciliation check at ${time} EAT...`);
  
  try {
    const result = await reconcileDailyOpeningStock();
    
    if (result.reconciled > 0) {
      console.log(`   ⚠️  Fixed ${result.reconciled} discrepancies`);
    } else {
      console.log(`   ✅ No discrepancies found`);
    }
  } catch (error) {
    console.error(`   ❌ Hourly reconciliation failed:`, error.message);
  }
}

/**
 * Initialize scheduled jobs
 */
export function initializeScheduledJobs() {
  console.log('\n🚀 ========================================');
  console.log('   AUTOMATED AUDIT SYSTEM INITIALIZED');
  console.log('========================================\n');

  // Daily audit at 6:00 AM EAT (3:00 AM UTC)
  // Cron format: minute hour day month weekday
  cron.schedule('0 3 * * *', () => {
    runDailyAudit();
  }, {
    timezone: 'Africa/Nairobi'
  });
  console.log('✅ Daily audit scheduled: 6:00 AM EAT');

  // Hourly reconciliation check
  cron.schedule('0 * * * *', () => {
    runHourlyReconciliation();
  }, {
    timezone: 'Africa/Nairobi'
  });
  console.log('✅ Hourly reconciliation scheduled: Every hour');

  // Run initial audit on startup (after 10 seconds)
  setTimeout(() => {
    console.log('\n🔄 Running initial audit on startup...\n');
    runDailyAudit();
  }, 10000);
  console.log('✅ Initial audit: 10 seconds after startup');

  console.log('\n========================================\n');
}

/**
 * Manual trigger for testing
 */
export async function triggerManualAudit() {
  console.log('\n🔧 Manual audit triggered...\n');
  await runDailyAudit();
}
