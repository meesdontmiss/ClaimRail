// All database access in ClaimRail uses Drizzle ORM (see src/lib/db/index.ts).
// If Supabase-specific features are needed in the future (Realtime, Storage, Edge Functions),
// re-add the client here:
//
//   import { createClient } from '@supabase/supabase-js'
//   export const supabaseAdmin = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     { auth: { autoRefreshToken: false, persistSession: false } }
//   )
