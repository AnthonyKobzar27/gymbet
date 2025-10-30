import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hkrnmppyxnzxkravoxig.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrcm5tcHB5eG56eGtyYXZveGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NTU4MzIsImV4cCI6MjA3NzQzMTgzMn0.5moWcjghuwtrXVJYCY9X1uTlMXtY8bvkkcbBZZ-q3NY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

