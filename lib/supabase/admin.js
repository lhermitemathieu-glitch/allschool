import { createClient } from '@supabase/supabase-js'

// Client service role — bypass RLS — server-side only (jamais exposé au client)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
