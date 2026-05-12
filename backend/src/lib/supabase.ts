import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

// Service-role DB client — used for all supabase.from() queries.
// NEVER call supabase.auth.signInWithPassword() on this instance: it would store a
// user JWT session and cause subsequent DB calls to run under user-level RLS instead
// of bypassing it with the service role key.
export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Isolated auth client — only used for signInWithPassword (credential validation).
// Kept separate so session state never bleeds into the DB client above.
export const supabaseAuth = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
