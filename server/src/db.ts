import { createClient } from "@supabase/supabase-js";


// SUPABASE_SERVICE_ROLE_KEY is the canonical name; SUPABASE_SECRET_KEY is the
// newer Supabase key name with the same role.
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

export const supabase = createClient(process.env.SUPABASE_URL ?? "", serviceRoleKey, {
  auth: { persistSession: false },
});
