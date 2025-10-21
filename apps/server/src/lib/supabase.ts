import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
  : null;
