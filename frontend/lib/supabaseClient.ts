import { createClient } from '@supabase/supabase-js';

// Use your actual Supabase project credentials
const supabaseUrl = 'https://mdyrsixljvfxpvyjtadi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keXJzaXhsanZmeHB2eWp0YWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3OTY2NzksImV4cCI6MjA2OTM3MjY3OX0.ZIf7kFYPlmYkZJzmfArUZEi3fXZFFqwuSBF1RHyVE6Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
