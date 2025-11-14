# Game Ending Rules

## Overview
The game now has an automatic ending condition: **when 2 players fail verification, the game ends immediately** and their stakes are distributed to the remaining active players.

## How It Works

### Game Ending Conditions
A game ends under two scenarios:

1. **2+ Players Eliminated** (NEW!)
   - When 2 or more players fail verification or miss proofs
   - All remaining active players are marked as **winners**
   - Game status changes to `completed`

2. **Last Player Standing** (Existing)
   - When only 1 player remains active
   - That player is marked as the **winner**
   - Game status changes to `completed`

### Ways Players Get Eliminated

1. **PBFT Proof Rejection**
   - Validators vote on submitted workout proofs
   - If rejections exceed threshold (>1/3 of validators)
   - Player is eliminated and stake is slashed
   - Location: `lib/activity_log_utils.ts:448-552`

2. **Missed Proof Deadline**
   - Player fails to submit workout proof by deadline
   - Automatic elimination via daily check
   - Location: `lib/game_utils.ts:855-963`

### Stake Distribution

When a player is eliminated:
1. Their stake is **immediately redistributed** equally to all remaining active players
2. Each active player receives: `stake_amount / number_of_active_players`
3. Transaction is recorded as a `payout` in their balance

When 2 players are eliminated and game ends:
- Both eliminated players' stakes have already been distributed during elimination
- No additional redistribution happens at game end
- Winners keep all payouts received from eliminations

## Implementation Details

### Modified Files

#### 1. `lib/activity_log_utils.ts` (Lines 493-545)
Added logic after PBFT stake slashing:
```typescript
// Count eliminated players
const { data: eliminatedPlayers } = await supabase
  .from('game_players')
  .select('user_hash')
  .eq('game_id', fullLog.game_id)
  .eq('status', 'eliminated');

if (eliminatedCount >= 2) {
  // Mark all active players as winners
  // End the game
  // Add game end log
}
```

#### 2. `lib/game_utils.ts` (Lines 807-885)
Enhanced `redistributeStake()` function:
- Checks both elimination count and remaining player count
- Ends game if 2+ players eliminated
- Marks all remaining players as winners
- Adds appropriate game end log

### Database Schema

#### `game_players` table:
- `status`: `'active'` | `'eliminated'` | `'winner'`
- Player status changes:
  - `active` → `eliminated` (when proof fails or missed)
  - `active` → `winner` (when game ends with player still active)

#### `games` table:
- `status`: `'joinable'` | `'active'` | `'completed'`
- `ended_at`: Timestamp when game completed

## Examples

### Scenario 1: 2 Players Fail PBFT Verification
```
Game starts: 8 players (each staked $10)
Player 1 submits fake proof → PBFT rejects → Eliminated
  └─> $10 stake distributed to 7 players (~$1.43 each)
Player 2 submits fake proof → PBFT rejects → Eliminated
  └─> $10 stake distributed to 6 players (~$1.67 each)
  └─> 🏁 GAME ENDS! 6 remaining players marked as winners
  └─> Each winner received ~$3.10 total ($1.43 + $1.67)
```

### Scenario 2: 1 PBFT Rejection + 1 Missed Proof
```
Game starts: 8 players (each staked $10)
Player 1's proof rejected → Eliminated
  └─> $10 distributed to 7 players (~$1.43 each)
Player 2 misses deadline → Eliminated
  └─> $10 distributed to 6 players (~$1.67 each)
  └─> 🏁 GAME ENDS! 6 remaining players marked as winners
```

### Scenario 3: Traditional Winner (1 Player Remains)
```
Game starts: 8 players
Players eliminated one by one over time
Only Player 8 remains
  └─> 🏆 Player 8 wins! (Received all 7 other stakes)
```

## User Experience

### Game Logs
When 2 players are eliminated, the game log shows:
```
🏁 Game ended! 2 players eliminated. 6 winners!
```

When 1 player remains:
```
🏆 0x12345678 won the game!
```

### Player Status
- **Winners**: All players with `status='winner'` when game ends
- **Eliminated**: Players who failed verification or missed proofs
- **Losers**: Players eliminated before 2-player threshold (not winners)

## Benefits

1. **Faster Game Completion**: Games don't drag on for weeks
2. **Fair Distribution**: Stakes distributed immediately on elimination
3. **Multiple Winners**: Encourages participation (not just 1 winner)
4. **Cheater Penalty**: Fake proofs result in quick elimination
5. **Motivation**: Players compete to survive until 2 eliminations occur

## Testing

To test this feature:
1. Create a game with 8 players
2. Have 2 players submit proofs that get rejected by PBFT
3. Verify game ends immediately
4. Check remaining players are marked as `winner`
5. Verify stakes were distributed correctly

## Future Enhancements

Consider adding:
- Configurable elimination threshold (2, 3, or 4 players)
- Different payout structures (winner-take-all vs. equal split)
- Bonus for most workouts logged
- Season-long leaderboards
