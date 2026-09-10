export const supabaseConfig = {
  projectRef: process.env.SUPABASE_PROJECT_REF || 'elaekvkqftsxrrynyhoy',
  url: process.env.SUPABASE_URL || `https://${process.env.SUPABASE_PROJECT_REF || 'elaekvkqftsxrrynyhoy'}.supabase.co`,
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  bucket: process.env.SUPABASE_STORAGE_BUCKET || 'uploads',
}
