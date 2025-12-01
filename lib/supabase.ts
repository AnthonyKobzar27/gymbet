import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://zxqqzcscagibmuqcxqkh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF6Y3NjYWdpYm11cWN4cWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDY3MjIsImV4cCI6MjA3ODQ4MjcyMn0.8s0gEhW06eDThGEdvVakNIAVKyt4y1y-KRyrtW_Lb5Y';

// Configure Supabase auth to persist sessions on device so users stay logged in
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // not needed in native apps
  },
});

