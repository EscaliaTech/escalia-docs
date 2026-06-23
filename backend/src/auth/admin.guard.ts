import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extract(req);
    if (!token) throw new UnauthorizedException('missing admin token');
    this.auth.verifyAdmin(token);
    return true;
  }

  private extract(req: Request): string | null {
    const h = req.headers['authorization'];
    if (h?.startsWith('Bearer ')) return h.slice(7);
    const c = (req as any).cookies?.['admin_session'];
    return c ?? null;
  }
}
