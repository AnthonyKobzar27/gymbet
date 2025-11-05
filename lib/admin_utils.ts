import { checkAndProcessMissedProofs } from './game_utils';

/**
 * Admin utility to manually trigger missed proof processing
 * In production, this should be called by a daily cron job (e.g., Supabase Edge Function)
 *
 * Recommended schedule: Run daily at a time after the latest wake-up time
 * (e.g., if wake-up times are 6-10 AM, run this at 11 AM daily)
 */
export async function runDailyMissedProofCheck(): Promise<void> {
  console.log('🔍 Running daily missed proof check...');

  try {
    await checkAndProcessMissedProofs();
    console.log('✅ Daily missed proof check completed successfully');
  } catch (error) {
    console.error('❌ Error during daily missed proof check:', error);
    throw error;
  }
}

/**
 * Setup instructions for production:
 *
 * 1. Create a Supabase Edge Function:
 *    - Create file: supabase/functions/daily-check/index.ts
 *    - Import and call checkAndProcessMissedProofs()
 *
 * 2. Set up pg_cron in Supabase:
 *    ```sql
 *    SELECT cron.schedule(
 *      'daily-missed-proof-check',
 *      '0 11 * * *',  -- Run at 11 AM daily
 *      $$SELECT net.http_post(
 *        url:='https://[your-project].supabase.co/functions/v1/daily-check',
 *        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [service-role-key]"}'::jsonb
 *      )$$
 *    );
 *    ```
 *
 * 3. Alternative: Use external cron service (e.g., GitHub Actions, Vercel Cron)
 */
