import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

export interface AdminClaims {
  role: 'admin';
  sub: string;
}
export interface ReaderClaims {
  role: 'reader';
  tenantId: number;
}

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  private get adminSecret() {
    return process.env.JWT_ADMIN_SECRET ?? 'change-me-admin-secret';
  }
  private get readerSecret() {
    return process.env.JWT_READER_SECRET ?? 'change-me-reader-secret';
  }

  async adminLogin(user: string, pass: string): Promise<string> {
    const envUser = process.env.ADMIN_USER ?? '';
    const envHash = process.env.ADMIN_PASS_HASH ?? '';
    const userOk = user === envUser;
    const passOk = envHash ? await bcrypt.compare(pass, envHash) : false;
    if (!userOk || !passOk) throw new UnauthorizedException('bad credentials');
    return this.jwt.sign({ role: 'admin', sub: user } as AdminClaims, {
      secret: this.adminSecret,
      expiresIn: process.env.ADMIN_TOKEN_TTL ?? '12h',
    });
  }

  verifyAdmin(token: string): AdminClaims {
    try {
      const c = this.jwt.verify<AdminClaims>(token, { secret: this.adminSecret });
      if (c.role !== 'admin') throw new Error('role');
      return c;
    } catch {
      throw new UnauthorizedException('invalid admin token');
    }
  }

  async unlock(accessHash: string | null, password: string, tenantId: number): Promise<string> {
    if (!accessHash) throw new UnauthorizedException('tenant has no credential set');
    const ok = await bcrypt.compare(password, accessHash);
    if (!ok) throw new UnauthorizedException('bad credential');
    return this.jwt.sign({ role: 'reader', tenantId } as ReaderClaims, {
      secret: this.readerSecret,
      expiresIn: process.env.READER_TOKEN_TTL ?? '8h',
    });
  }

  verifyReader(token: string, tenantId: number): boolean {
    try {
      const c = this.jwt.verify<ReaderClaims>(token, { secret: this.readerSecret });
      return c.role === 'reader' && c.tenantId === tenantId;
    } catch {
      return false;
    }
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }
}
