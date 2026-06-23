import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '@/db/db.service';
import { tenants, Tenant } from '@/db/schema';
import { AuthService } from '@/auth/auth.service';

@Injectable()
export class TenantsService {
  constructor(private dbs: DbService, private auth: AuthService) {}

  private get db() {
    return this.dbs.db;
  }

  async list(): Promise<Tenant[]> {
    return this.db.select().from(tenants);
  }

  async getById(id: number): Promise<Tenant> {
    const [t] = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!t) throw new NotFoundException('tenant not found');
    return t;
  }

  async create(input: { key: string; host: string; name: string }): Promise<Tenant> {
    const [clash] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.key, input.key))
      .limit(1);
    if (clash) throw new ConflictException(`tenant key "${input.key}" exists`);
    const [t] = await this.db.insert(tenants).values(input).returning();
    return t;
  }

  async setCredential(id: number, password: string): Promise<void> {
    await this.getById(id);
    const accessHash = await this.auth.hash(password);
    await this.db
      .update(tenants)
      .set({ accessHash, updatedAt: new Date() })
      .where(eq(tenants.id, id));
  }

  async clearCredential(id: number): Promise<void> {
    await this.getById(id);
    await this.db
      .update(tenants)
      .set({ accessHash: null, updatedAt: new Date() })
      .where(eq(tenants.id, id));
  }
}
