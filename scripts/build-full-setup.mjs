import fs from 'node:fs';
import path from 'node:path';

const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const migDir = 'supabase/migrations';
const migFiles = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();

let combined = '-- ========================================================\n';
combined += '-- NhaDat-Radar FULL CONSOLIDATED DATABASE SETUP\n';
combined += '-- ========================================================\n\n';
combined += schema + '\n\n';

for (const f of migFiles) {
  combined += `-- --- MIGRATION: ${f} ---\n`;
  combined += fs.readFileSync(path.join(migDir, f), 'utf8') + '\n\n';
}

fs.writeFileSync('supabase/full-setup.sql', combined, 'utf8');
console.log('Successfully created supabase/full-setup.sql, total size:', combined.length, 'bytes');
