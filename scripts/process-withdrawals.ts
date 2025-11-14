/**
 * Admin script to process withdrawal requests
 *
 * Usage:
 *   npx ts-node scripts/process-withdrawals.ts list
 *   npx ts-node scripts/process-withdrawals.ts process <withdrawal_id>
 *   npx ts-node scripts/process-withdrawals.ts process-all
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_SECRET = process.env.ADMIN_SECRET!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables')
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function callProcessWithdrawals(action: string, withdrawalId?: string) {
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

async function processWithdrawal(withdrawalId: string) {
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

switch (command) {
  case 'list':
    listWithdrawals()
    break

  case 'process':
    if (!arg) {
      console.error('❌ Please provide a withdrawal ID')
      console.log('Usage: npx ts-node scripts/process-withdrawals.ts process <withdrawal_id>')
      process.exit(1)
    }
    processWithdrawal(arg)
    break

  case 'process-all':
    processAllWithdrawals()
    break

  default:
    console.log('Usage:')
    console.log('  npx ts-node scripts/process-withdrawals.ts list')
    console.log('  npx ts-node scripts/process-withdrawals.ts process <withdrawal_id>')
    console.log('  npx ts-node scripts/process-withdrawals.ts process-all')
    process.exit(1)
}
