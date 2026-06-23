import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import { join } from 'path';
import * as schema from '@/db/schema';

async function main() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const client = createClient({ url });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
  const base = process.env.BASE_DOMAIN ?? 'escalia.tech';

  const want = [
    { key: 'kuai', host: `kuai-docs.${base}`, name: 'Kuai' },
    { key: 'portas', host: `portas-docs.${base}`, name: 'Portas' },
  ];

  for (const t of want) {
    const [exists] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.key, t.key))
      .limit(1);
    if (exists) {
      console.log(`tenant ${t.key} exists, skip`);
      continue;
    }
    await db.insert(schema.tenants).values(t);
    console.log(`seeded tenant ${t.key} -> ${t.host}`);
  }
  client.close();
}

main();
