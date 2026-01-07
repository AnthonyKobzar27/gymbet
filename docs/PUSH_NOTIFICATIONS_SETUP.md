# Push Notifications Setup Guide

## Overview

This app uses Expo Push Notifications for real-time user engagement. Push notifications are sent for:

1. **Daily Workout Reminders** - 9:00 AM PST daily for active game players
2. **Game Started** - When a game reaches 8 players
3. **Player Joined** - When someone joins your game
4. **Player Eliminated** - When you or another player is eliminated
5. **Game Won** - When you win a game
6. **Proof Approved/Rejected** - When your proof is validated

## Setup Steps

### 1. Database Setup

Run the schema to create the `push_tokens` table:

```sql
-- Run in Supabase SQL Editor
-- Copy contents from database/push_tokens_schema.sql
```

### 2. Expo Project Configuration

Ensure your `app.json` or `app.config.js` has:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#000000",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    "android": {
      "useNextNotificationsApi": true
    },
    "ios": {
      "usesAppleSignIn": false
    }
  }
}
```

### 3. Deploy Edge Functions

Deploy the edge functions to Supabase:

```bash
# Navigate to supabase directory
cd snooze-app-actual/supabase

# Deploy all notification functions
supabase functions deploy send-push-notification
supabase functions deploy daily-workout-reminder
supabase functions deploy game-event-notification
```

### 4. Set Up Cron Job for Daily Reminders

In Supabase Dashboard:

1. Go to **Database** > **Extensions**
2. Enable `pg_cron` and `pg_net` extensions
3. Go to **SQL Editor**
4. Run:

```sql
SELECT cron.schedule(
  'daily-workout-reminder',
  '0 17 * * *',  -- 9 AM PST = 5 PM UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-workout-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_SERVICE_ROLE_KEY` with your service role key

### 5. EAS Build Configuration

For standalone builds, you need to configure EAS:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android  
eas build --platform android
```

## Testing Push Notifications

### Local Testing

You can test push notifications using the Expo push notification tool:
https://expo.dev/notifications

### Test from Code

```typescript
import { scheduleLocalNotification } from '@/lib/push_notifications';

// Send a test notification
await scheduleLocalNotification(
  'Test Notification',
  'This is a test push notification!'
);
```

### Test Daily Reminder Manually

```bash
# Call the edge function directly
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-workout-reminder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Notification Types

| Type | Trigger | Recipients |
|------|---------|------------|
| `daily-reminder` | 9 AM PST cron | All active game players |
| `game_started` | 8th player joins | All 8 players |
| `player_joined` | Player joins game | Other players in game |
| `player_eliminated` | Player misses proof | Eliminated player + remaining players |
| `game_won` | Game ends with winner | Winner + all other players |
| `proof_approved` | Proof validated | Proof submitter |
| `proof_rejected` | Proof rejected | Proof submitter |

## Troubleshooting

### Notifications not arriving

1. Check device permissions in Settings
2. Verify push token is saved in `push_tokens` table
3. Check edge function logs in Supabase Dashboard
4. Ensure device is a physical device (not simulator for iOS)

### Cron job not running

1. Verify `pg_cron` extension is enabled
2. Check job status: `SELECT * FROM cron.job;`
3. Check job history: `SELECT * FROM cron.job_run_details;`

### Token not saving

1. Check if user is authenticated
2. Verify `profiles` table has user's `hash`
3. Check Supabase RLS policies on `push_tokens` table

