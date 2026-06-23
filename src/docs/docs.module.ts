import { Module } from '@nestjs/common';
import { DocsService } from '@/docs/docs.service';
import { TenantsService } from '@/docs/tenants.service';
import { StorageService } from '@/docs/storage.service';
import { PublicController } from '@/docs/public.controller';
import { AdminController } from '@/docs/admin.controller';

@Module({
  controllers: [AdminController, PublicController],
  providers: [DocsService, TenantsService, StorageService],
})
export class DocsModule {}
