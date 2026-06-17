// Postgres local SEM Docker (apenas para desenvolvimento).
// Sobe um PostgreSQL real via embedded-postgres em apps/api/.pgdata.
// Uso: pnpm db:embedded  (mantém rodando; Ctrl+C para parar)
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseDir = resolve(__dirname, '..', '.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'unicorp',
  password: 'unicorp',
  port: 5432,
  persistent: true,
});

async function main() {
  if (!existsSync(databaseDir)) {
    console.log('[db] inicializando cluster em', databaseDir);
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase('unicorp');
    console.log('[db] banco "unicorp" criado');
  } catch {
    console.log('[db] banco "unicorp" já existe');
  }
  console.log('[db] PostgreSQL pronto em postgresql://unicorp:unicorp@localhost:5432/unicorp');
  console.log('[db] mantenha este processo aberto. Ctrl+C para parar.');
}

async function stop() {
  console.log('\n[db] parando PostgreSQL...');
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

main().catch((err) => {
  console.error('[db] erro:', err);
  process.exit(1);
});
