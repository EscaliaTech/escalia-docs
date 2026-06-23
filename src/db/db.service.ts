import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, Client } from '@libsql/client';
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { join } from 'path';
import * as schema from '@/db/schema';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private client!: Client;
  public db!: LibSQLDatabase<typeof schema>;

  async onModuleInit() {
    const url = process.env.DATABASE_URL ?? 'file:./dev.db';
    this.client = createClient({ url });
    await this.client.execute('PRAGMA foreign_keys = ON');
    this.db = drizzle(this.client, { schema });
    await migrate(this.db, { migrationsFolder: join(process.cwd(), 'drizzle') });
  }

  onModuleDestroy() {
    this.client?.close();
  }
}
