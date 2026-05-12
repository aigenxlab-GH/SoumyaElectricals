/**
 * wipe-products.mjs
 * Deletes ALL product / inventory / quotation data and resets code sequences.
 * Leaves users, holidays, system_config, timecards, leaves, overtime untouched.
 *
 * Run: node backend/scripts/wipe-products.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://mafdakbwchpmqqihpnbb.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZmRha2J3Y2hwbXFxaWhwbmJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2ODc4MywiZXhwIjoyMDkzODQ0NzgzfQ.BYnGfuhFdgak2Uml0nXPF4Qjw57xUuYMjdZnQlJcnEc'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function wipeAndCount() {
  console.log('\n🗑️  Wiping product / inventory / quotation data...\n')

  // Delete order respects FKs.
  // quotation_items CASCADE-deletes when its parent quotation is removed.
  const tables = [
    { name: 'quotation_items',    filter: (q) => q.gte('id', '00000000-0000-0000-0000-000000000000') },
    { name: 'quotations',         filter: (q) => q.gte('id', '00000000-0000-0000-0000-000000000000') },
    { name: 'inventory_forecast', filter: (q) => q.gte('id', '00000000-0000-0000-0000-000000000000') },
    { name: 'inventory',          filter: (q) => q.gte('id', '00000000-0000-0000-0000-000000000000') },
    { name: 'products',           filter: (q) => q.gte('id', '00000000-0000-0000-0000-000000000000') },
  ]

  for (const { name, filter } of tables) {
    const { error } = await filter(supabase.from(name).delete())
    if (error) console.warn(`  ⚠️  ${name}: ${error.message}`)
    else        console.log(`  ✓ cleared ${name}`)
  }

  // Reset code sequences via RPC (need a helper SQL function). Fall back to a
  // raw SQL call through PostgREST is not available — emit a notice instead.
  console.log('\n  ℹ️  Sequence reset: run this once in Supabase SQL Editor:')
  console.log('     ALTER SEQUENCE product_code_seq   RESTART WITH 1;')
  console.log('     ALTER SEQUENCE quotation_code_seq RESTART WITH 1;')

  // Verify counts
  console.log('\n  Verifying...')
  for (const { name } of tables) {
    const { count, error } = await supabase.from(name).select('*', { count: 'exact', head: true })
    if (error) console.warn(`    ⚠️  ${name}: ${error.message}`)
    else        console.log(`    ${name.padEnd(20)} = ${count}`)
  }

  console.log('\n' + '═'.repeat(50))
  console.log('✅  WIPE COMPLETE')
  console.log('═'.repeat(50) + '\n')
}

wipeAndCount().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1) })
