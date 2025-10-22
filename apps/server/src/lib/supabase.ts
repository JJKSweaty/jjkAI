import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) && 
                        (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
    )
  : null;
