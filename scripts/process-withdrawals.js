/**
 * Admin script to process withdrawal requests
 *
 * Usage:
 *   node scripts/process-withdrawals.js list
 *   node scripts/process-withdrawals.js process <withdrawal_id>
 *   node scripts/process-withdrawals.js process-all
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const ADMIN_SECRET = process.env.ADMIN_SECRET

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables')
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_SECRET')
  console.error('Make sure your .env file contains these variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function callProcessWithdrawals(action, withdrawalId) {
  const { data, error } = await supabase.functions.invoke('process-withdrawals', {
    body: {
      action,
      adminSecret: ADMIN_SECRET,
      withdrawalId
    }
  })

  if (error) {
    console.error('❌ Error:', error)
    return null
  }

  return data
}

async function listWithdrawals() {
  console.log('📋 Fetching pending withdrawals...\n')

  const result = await callProcessWithdrawals('list')

  if (!result || !result.success) {
    console.error('Failed to fetch withdrawals')
    return
  }

  if (result.pending_count === 0) {
    console.log('✅ No pending withdrawals')
    return
  }

  console.log(`Found ${result.pending_count} pending withdrawal(s):\n`)

  for (const w of result.withdrawals) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`ID:       ${w.id}`)
    console.log(`User:     ${w.user_hash}`)
    console.log(`Amount:   $${w.amount}`)
    console.log(`Status:   ${w.status}`)
    console.log(`Requested: ${new Date(w.requested_at).toLocaleString()}`)
    if (w.error_message) {
      console.log(`Error:    ${w.error_message}`)
    }
    console.log('')
  }
}

async function processWithdrawal(withdrawalId) {
  console.log(`💰 Processing withdrawal: ${withdrawalId}\n`)

  const result = await callProcessWithdrawals('process', withdrawalId)

  if (!result) {
    console.error('Failed to process withdrawal')
    return
  }

  if (result.error) {
    console.error(`❌ ${result.error}`)
    if (result.details) {
      console.error(`   Details: ${result.details}`)
    }
    if (result.balance_refunded) {
      console.log('💵 User balance has been refunded')
    }
    return
  }

  console.log('✅ Withdrawal processed successfully!')
  console.log(`   Refund ID: ${result.refund_id}`)
  console.log(`   Amount: $${result.amount}`)
  console.log(`   Status: ${result.status}`)
  console.log(`   ${result.message}`)
}

async function processAllWithdrawals() {
  console.log('💰 Processing all pending withdrawals...\n')

  const result = await callProcessWithdrawals('process_all')

  if (!result || !result.success) {
    console.error('Failed to process withdrawals')
    return
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Total:      ${result.total}`)
  console.log(`Successful: ${result.successful} ✅`)
  console.log(`Failed:     ${result.failed} ❌`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  if (result.results && result.results.length > 0) {
    console.log('Details:')
    for (const r of result.results) {
      if (r.success) {
        console.log(`  ✅ ${r.withdrawal_id}: $${r.amount} refunded (${r.refund_id})`)
      } else {
        console.log(`  ❌ ${r.withdrawal_id}: ${r.error}`)
      }
    }
  }
}

// Main
const command = process.argv[2]
const arg = process.argv[3]

;(async () => {
  switch (command) {
    case 'list':
      await listWithdrawals()
      break

    case 'process':
      if (!arg) {
        console.error('❌ Please provide a withdrawal ID')
        console.log('Usage: node scripts/process-withdrawals.js process <withdrawal_id>')
        process.exit(1)
      }
      await processWithdrawal(arg)
      break

    case 'process-all':
      await processAllWithdrawals()
      break

    default:
      console.log('Usage:')
      console.log('  node scripts/process-withdrawals.js list')
      console.log('  node scripts/process-withdrawals.js process <withdrawal_id>')
      console.log('  node scripts/process-withdrawals.js process-all')
      process.exit(1)
  }
})()
