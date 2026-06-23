import { Injectable } from '@nestjs/common';
import { promises as fs, createReadStream } from 'fs';
import { join, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private root = resolve(process.env.STORAGE_DIR ?? './storage');

  private tenantDir(tenantKey: string) {
    return join(this.root, tenantKey);
  }

  async save(tenantKey: string, buffer: Buffer, ext: string): Promise<string> {
    const dir = this.tenantDir(tenantKey);
    await fs.mkdir(dir, { recursive: true });
    const fileName = `${uuidv4()}${ext}`;
    await fs.writeFile(join(dir, fileName), buffer);
    return fileName;
  }

  fullPath(tenantKey: string, fileName: string): string {
    const p = resolve(this.tenantDir(tenantKey), fileName);
    if (!p.startsWith(this.tenantDir(tenantKey))) {
      throw new Error('path traversal blocked');
    }
    return p;
  }

  stream(tenantKey: string, fileName: string) {
    return createReadStream(this.fullPath(tenantKey, fileName));
  }

  async remove(tenantKey: string, fileName: string): Promise<void> {
    await fs.rm(this.fullPath(tenantKey, fileName), { force: true });
  }
}
