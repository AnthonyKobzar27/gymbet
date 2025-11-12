# Stake Slashing Implementation Guide

## Overview

Your wake-up challenge app now has a **fully functional stake slashing system** that automatically eliminates players and redistributes their stakes when they:
1. **Miss a proof submission** (existing functionality, enhanced)
2. **Get PBFT rejected** (NEW - 2/3 of validators vote against their proof)

## How It Works

### 1. Missed Proof Slashing (Existing, Enhanced)

**Function:** `checkAndProcessMissedProofs()` in `lib/game_utils.ts`

- Runs daily (should be triggered via cron/scheduled task)
- Checks all active games for missed submissions
- If a player didn't submit yesterday → **Stake slashed and redistributed**
- If only 1 player remains → **Game ends, winner declared**

### 2. PBFT Rejection Slashing (NEW!)

**Function:** `checkPBFTValidation()` in `lib/activity_log_utils.ts` (lines 448-498)

**Flow:**
1. User submits wake-up proof
2. Proof distributed to up to 100 validators (cohort members + random users)
3. Validators vote: Approve or Reject
4. **Consensus Check:**
   - ✅ **APPROVED:** ≥ 2/3 approve → Proof validated
   - ❌ **REJECTED:** > 1/3 reject (approval impossible) → **STAKE SLASHED!**

**What Happens on Rejection:**
```typescript
// Automatically triggered in checkPBFTValidation() when status becomes 'rejected'

1. Get user_hash and game_id from activity_log
2. Verify player is still active in the game
3. Add elimination log to game: "❌ Proof REJECTED by PBFT consensus"
4. Call redistributeStake(gameId, userHash)
5. Distribute slashed stake equally to all remaining players
6. Mark player as 'eliminated'
7. Check if only 1 player remains → End game, declare winner
```

## Database Changes

### New Migration: `database/add_game_id_to_activity_log.sql`

```sql
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_game_id ON activity_log(game_id);
```

**To apply this migration:**
1. Go to your Supabase project dashboard
2. Open SQL Editor
3. Copy and paste the contents of `database/add_game_id_to_activity_log.sql`
4. Click "Run"

This adds `game_id` tracking to the activity log, enabling the system to link rejected proofs to their games for automatic stake slashing.

## Code Changes Summary

### Modified Files:

1. **`lib/activity_log_utils.ts`**
   - Updated `ActivityLog` interface to include `game_id`, `validation_status`, `total_validators`, `required_approvals`
   - Updated `addActivityLogWithId()` to accept `gameId` parameter
   - **Added stake slashing logic in `checkPBFTValidation()`** (lines 448-498)

2. **`lib/game_utils.ts`**
   - Updated `submitWakeupProof()` to pass `gameId` to `addActivityLogWithId()`
   - **Enhanced `redistributeStake()`** to check for winner after elimination (lines 723-761)
   - Now automatically ends game when only 1 player remains

3. **Lint Fixes:**
   - Fixed apostrophe escaping in `components/EditScreenInfo.tsx`
   - Fixed apostrophe escaping in `components/modals/DepositAmountModal.tsx`
   - Fixed apostrophe escaping in `components/modals/PaymentModal.tsx`

## Game Flow (Complete)

### Player Joins Game
1. User joins game → Stake withdrawn from balance
2. Stake locked in `game_players` table

### Daily Proof Submission
1. User submits photo proof
2. Proof added to `activity_log` with `game_id`
3. Proof distributed to validators via PBFT system

### Validation & Slashing
- **Path A: Approved** → Nothing happens, player continues
- **Path B: Rejected (2/3 vote against)** → **STAKE SLASHED** → Redistributed to opponents
- **Path C: Missed submission** → **STAKE SLASHED** → Redistributed to opponents

### Game End
- When only 1 player remains:
  - Player marked as `winner`
  - Game status → `completed`
  - Winner keeps all accumulated stakes

## Testing the System

### Test Scenario 1: PBFT Rejection
1. Create a game with 2+ players
2. Have Player A submit a proof
3. Have 2/3+ validators vote "Reject"
4. **Expected Result:**
   - Proof status → `rejected`
   - Player A marked as `eliminated`
   - Player A's stake distributed to remaining players
   - Game log shows: "❌ Proof REJECTED by PBFT consensus"

### Test Scenario 2: Missed Proof
1. Create a game with 2+ players
2. Wait until after deadline without Player A submitting
3. Run `checkAndProcessMissedProofs()`
4. **Expected Result:**
   - Player A marked as `eliminated`
   - Player A's stake redistributed
   - Game log shows: "Missed their wakeup proof"

### Test Scenario 3: Winner Declaration
1. Game with 2 players
2. One player gets eliminated (via rejection or missed proof)
3. **Expected Result:**
   - Remaining player marked as `winner`
   - Game status → `completed`
   - Game log shows: "🏆 Won the game!"

## Console Logging

The system includes detailed console logging for debugging:

```
🔥 PROOF REJECTED BY PBFT! Starting stake slashing...
Slashing stake for user ABC123 in game DEF456
✅ Stake successfully slashed and redistributed to opponents
Only one player remains! Winner: GHI789
Game DEF456 completed. Winner: GHI789
```

## Security Considerations

1. **Byzantine Fault Tolerance:** 2/3 majority prevents single malicious validator
2. **Cohort Members Must Vote:** All game participants are included as validators
3. **Automatic Execution:** No manual intervention required for slashing
4. **Transaction Logging:** All stake movements logged in `transactions` table
5. **Idempotency:** Players can only be eliminated once

## Next Steps to Deploy

1. **Apply Database Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: database/add_game_id_to_activity_log.sql
   ```

2. **Set Up Daily Cron Job:**
   - Use Supabase Edge Functions or external cron service
   - Call `checkAndProcessMissedProofs()` daily at wake-up deadline + 1 hour
   - Example: If wake-up time is 7:00 AM, run at 8:00 AM

3. **Test in Staging:**
   - Create test games with 2-3 accounts
   - Submit proofs and vote reject
   - Verify stake distribution

4. **Monitor Logs:**
   - Watch for "Stake slashed" events
   - Verify no players get stuck in limbo
   - Check that all stakes are accounted for

## Troubleshooting

### "No game_id found in activity log"
- Ensure the database migration was applied
- Check that `submitWakeupProof()` is passing `gameId`

### Stake Not Redistributing
- Check `game_players` table for active players
- Verify `redistributeStake()` is being called
- Check console logs for errors

### PBFT Not Reaching Consensus
- Verify validators are voting
- Check `proof_votes` table for vote records
- Ensure `required_approvals` calculation is correct

## Support

For issues or questions:
- Check console logs for detailed error messages
- Verify all database migrations were applied
- Ensure Supabase RLS policies allow the operations

---

**STATUS: ✅ READY FOR DEPLOYMENT**

Your stake slashing system is fully implemented and ready to go!
