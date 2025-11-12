import { createClient } from '@supabase/supabase-js'

// Use environment variables for configuration (safer and more flexible)
const supabaseUrl = 'https://zxqqzcscagibmuqcxqkh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cXF6Y3NjYWdpYm11cWN4cWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDY3MjIsImV4cCI6MjA3ODQ4MjcyMn0.8s0gEhW06eDThGEdvVakNIAVKyt4y1y-KRyrtW_Lb5Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

