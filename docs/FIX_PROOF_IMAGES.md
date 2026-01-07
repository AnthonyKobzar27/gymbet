# Fix Proof Images Not Showing

## Problem
When submitting a workout proof with a photo, the image doesn't display in the proof card.

## Solution Steps

### Step 1: Check Supabase Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Check if `workout-proofs` bucket exists
3. **CRITICAL**: Make sure the bucket is **PUBLIC** (not private)
   - Click on the bucket
   - Go to Settings
   - Ensure "Public bucket" is enabled

### Step 2: Run SQL to Create/Fix Bucket

If the bucket doesn't exist or isn't public, run this SQL:

```sql
-- Copy from database/create_workout_proofs_bucket.sql
```

Or go to **Dashboard** → **Storage** → **Create bucket**:
- Name: `workout-proofs`
- ✅ **Public bucket** (MUST be checked!)

### Step 3: Test Image Upload

1. Submit a proof through the app
2. Check the console logs for:

```
=== PROOF IMAGE URL ===
fileName: <game-id>/<user-hash>/<date>.jpg
publicUrl: https://<project>.supabase.co/storage/v1/object/public/workout-proofs/...
=====================

=== ADDING TO ACTIVITY LOG ===
Image URL being saved: https://...
============================

=== INSERT TO activity_log TABLE ===
image parameter: https://...
====================================

=== INSERTED DATA RETURNED ===
id: 123
image: https://...
==============================
```

3. If `publicUrl` is `null` or empty → **Storage bucket is private**
4. If `image` in inserted data is `null` → **Check the insert logic**
5. If image URL exists but doesn't load → **Check CORS/bucket permissions**

### Step 4: Verify Database

Check if images are being stored:

```sql
SELECT id, user_hash, message, image, created_at 
FROM activity_log 
WHERE typeofmessage = 'workout'
ORDER BY created_at DESC
LIMIT 10;
```

The `image` column should contain URLs like:
```
https://yourproject.supabase.co/storage/v1/object/public/workout-proofs/...
```

### Step 5: Test Image URL

Copy an image URL from the database and paste it in your browser.

- **If it loads**: ✅ Storage is working, issue is in the app
- **If 404**: ❌ File wasn't uploaded or bucket is private
- **If 403**: ❌ Bucket permissions are wrong

## Common Issues

### Issue 1: Bucket is Private
**Symptoms**: `publicUrl` is generated but images return 404 or 403

**Fix**:
```sql
UPDATE storage.buckets 
SET public = true 
WHERE name = 'workout-proofs';
```

### Issue 2: RLS Blocking Access
**Symptoms**: Images upload but can't be read

**Fix**:
```sql
-- Add public read policy
CREATE POLICY "Public read access for workout-proofs" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'workout-proofs');
```

### Issue 3: CORS Issues (Web Only)
**Symptoms**: Images work in mobile but not in web

**Fix**: Add CORS policy in Supabase Dashboard → Settings → API → CORS

### Issue 4: Image Field Not in Schema
**Symptoms**: Logs show image being inserted but it's null in database

**Fix**: Verify `activity_log` table has `image` column:
```sql
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS image TEXT;
```

## Debugging Checklist

- [ ] `workout-proofs` bucket exists
- [ ] Bucket is set to **PUBLIC**
- [ ] RLS policy allows public reads
- [ ] Console logs show valid `publicUrl`
- [ ] Database has `image` column in `activity_log` table
- [ ] Image URLs return 200 when accessed in browser
- [ ] App is using latest code with logging

## Need More Help?

Check the console logs when submitting a proof. They will show exactly where the image URL is being lost.

