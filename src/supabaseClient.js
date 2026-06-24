import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qmlhcjxyyjewaoqzfbae.supabase.co';
const supabaseAnonKey = 'sb_publishable_f5knvBQX9u3FIH6eEUHObQ_ed1RleG3';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
