// Simple script to add test activity logs
// Run this to populate the feed with sample data

import { addActivityLog } from '../lib/activity_log_utils';

const testActivities = [
  {
    userHash: '0x742d35Cc6634C0532925a3b8',
    senderHash: '0x742d35Cc6634C0532925a3b8',
    message: 'woke up at 6:30 AM and won $10!',
    typeofmessage: 'wakeup',
  },
  {
    userHash: '0x89Ab23Ef5678C0532925a3b9',
    senderHash: '0x89Ab23Ef5678C0532925a3b9',
    message: 'said: "Let\'s go! Easy money"',
    typeofmessage: 'comment',
  },
  {
    userHash: '0x456f78Cd9012C0532925a3c0',
    senderHash: '0x456f78Cd9012C0532925a3c0',
    message: 'joined a new game with $5 stake',
    typeofmessage: 'bet',
  },
  {
    userHash: '0x123e45Bc6789C0532925a3d1',
    senderHash: '0x123e45Bc6789C0532925a3d1',
    message: 'woke up at 7:00 AM and won $15!',
    typeofmessage: 'win',
  },
  {
    userHash: '0x987g65Hi4321C0532925a3e2',
    senderHash: '0x987g65Hi4321C0532925a3e2',
    message: 'said: "Morning crew checking in!"',
    typeofmessage: 'comment',
  },
];

export async function addTestActivities() {
  console.log('Adding test activities...');

  for (const activity of testActivities) {
    const result = await addActivityLog(
      activity.userHash,
      activity.senderHash,
      activity.message,
      activity.typeofmessage
    );

    if (result) {
      console.log(`✓ Added: ${activity.message}`);
    } else {
      console.log(`✗ Failed: ${activity.message}`);
    }
  }

  console.log('Done!');
}
