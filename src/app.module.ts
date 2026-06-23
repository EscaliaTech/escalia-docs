import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '@/db/db.module';
import { AuthModule } from '@/auth/auth.module';
import { DocsModule } from '@/docs/docs.module';
import { TenantMiddleware } from '@/tenant/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    DocsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude({ path: 'admin/(.*)', method: RequestMethod.ALL })
      .forRoutes('*');
  }
}
