import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DbService } from '@/db/db.service';
import { documents, Document } from '@/db/schema';
import { StorageService } from '@/docs/storage.service';

@Injectable()
export class DocsService {
  constructor(private dbs: DbService, private storage: StorageService) {}

  private get db() {
    return this.dbs.db;
  }

  async findBySlug(tenantId: number, slug: string): Promise<Document | undefined> {
    const [doc] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.tenantId, tenantId), eq(documents.slug, slug)))
      .limit(1);
    return doc;
  }

  async listByTenant(tenantId: number): Promise<Document[]> {
    return this.db.select().from(documents).where(eq(documents.tenantId, tenantId));
  }

  async listAll(): Promise<Document[]> {
    return this.db.select().from(documents);
  }

  async getById(id: number): Promise<Document> {
    const [doc] = await this.db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!doc) throw new NotFoundException('document not found');
    return doc;
  }

  async create(input: {
    tenantId: number;
    tenantKey: string;
    slug: string;
    title?: string;
    isPublic: boolean;
    contentType: string;
    buffer: Buffer;
    ext: string;
  }): Promise<Document> {
    const existing = await this.findBySlug(input.tenantId, input.slug);
    if (existing) throw new ConflictException(`slug "${input.slug}" already exists for this tenant`);

    const fileName = await this.storage.save(input.tenantKey, input.buffer, input.ext);
    const [doc] = await this.db
      .insert(documents)
      .values({
        tenantId: input.tenantId,
        slug: input.slug,
        title: input.title ?? null,
        fileName,
        contentType: input.contentType,
        sizeBytes: input.buffer.length,
        isPublic: input.isPublic,
      })
      .returning();
    return doc;
  }

  async replaceFile(
    id: number,
    tenantKey: string,
    contentType: string,
    buffer: Buffer,
    ext: string,
  ): Promise<Document> {
    const doc = await this.getById(id);
    const newFile = await this.storage.save(tenantKey, buffer, ext);
    const [updated] = await this.db
      .update(documents)
      .set({
        fileName: newFile,
        contentType,
        sizeBytes: buffer.length,
        version: doc.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();
    await this.storage.remove(tenantKey, doc.fileName);
    return updated;
  }

  async updateMeta(
    id: number,
    patch: { slug?: string; title?: string; isPublic?: boolean },
  ): Promise<Document> {
    const doc = await this.getById(id);
    if (patch.slug && patch.slug !== doc.slug) {
      const clash = await this.findBySlug(doc.tenantId, patch.slug);
      if (clash) throw new ConflictException(`slug "${patch.slug}" already in use`);
    }
    const [updated] = await this.db
      .update(documents)
      .set({
        slug: patch.slug ?? doc.slug,
        title: patch.title ?? doc.title,
        isPublic: patch.isPublic ?? doc.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  async remove(id: number, tenantKey: string): Promise<void> {
    const doc = await this.getById(id);
    await this.db.delete(documents).where(eq(documents.id, id));
    await this.storage.remove(tenantKey, doc.fileName);
  }
}
