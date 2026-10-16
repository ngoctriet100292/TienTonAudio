import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = new URL('../backend/internal/domain/cultivation_realms.json', import.meta.url);
const realms = JSON.parse(readFileSync(source, 'utf8'));
for (let i = 0; i < realms.length; i++) {
  const r = realms[i];
  if (r.level !== i + 1 || !Number.isSafeInteger(r.min_exp) || (i === 0 && r.min_exp !== 0) || (i && r.min_exp !== realms[i - 1].max_exp) || (i === realms.length - 1 ? r.max_exp !== -1 : r.max_exp <= r.min_exp)) throw new Error(`Invalid realm: ${r.name}`);
}
const schema = readFileSync(new URL('../backend/db/migrations/schema.sql', import.meta.url), 'utf8');
const start = schema.indexOf('CREATE TABLE IF NOT EXISTS cultivation_realms');
if (start < 0) throw new Error('Missing catalogue table schema');
const ddl = schema.slice(start, schema.indexOf(';', start) + 1);
const columns = ['level', 'name', 'tier', 'tier_name', 'min_exp', 'description', 'ability', 'privilege', 'color'];
const quote = value => typeof value === 'number' ? String(value) : `'${value.replaceAll("'", "''")}'`;
const values = realms.map(r => `(${columns.map(c => quote(r[c])).join(', ')})`).join(',\n');
const sql = `-- Initial catalogue only; preserve existing database customizations and user EXP.\nBEGIN;\n${ddl}\nINSERT INTO cultivation_realms (${columns.join(', ')}) VALUES\n${values}\nON CONFLICT DO NOTHING;\nCOMMIT;\n`;
const migration = new URL('../backend/db/migrations/20261014_cultivation_catalogue.sql', import.meta.url);
writeFileSync(migration, sql);
console.log(`Seeded ${realms.length} realms; migration: ${fileURLToPath(migration)}`);
