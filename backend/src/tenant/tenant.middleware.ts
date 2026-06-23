import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { DbService } from '@/db/db.service';
import { tenants, Tenant } from '@/db/schema';

declare module 'express' {
  interface Request {
    tenant?: Tenant;
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private dbs: DbService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const host = (req.headers['host'] ?? '').toString().split(':')[0].toLowerCase();
    const [tenant] = await this.dbs.db
      .select()
      .from(tenants)
      .where(eq(tenants.host, host))
      .limit(1);
    if (!tenant) {
      throw new NotFoundException(`unknown host: ${host}`);
    }
    req.tenant = tenant;
    next();
  }
}
