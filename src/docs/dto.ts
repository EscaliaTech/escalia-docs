import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const toBool = ({ value }: { value: any }) =>
  value === true || value === 'true' || value === '1' || value === 1;

export class CreateDocDto {
  @Matches(SLUG_RE, { message: 'slug must be lowercase a-z0-9 and hyphens' })
  @MaxLength(200)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateDocDto {
  @IsOptional()
  @Matches(SLUG_RE, { message: 'slug must be lowercase a-z0-9 and hyphens' })
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isPublic?: boolean;
}

export class UnlockDto {
  @IsString()
  @MaxLength(200)
  password!: string;
}

export class LoginDto {
  @IsString()
  user!: string;

  @IsString()
  password!: string;
}

export class TenantDto {
  @Matches(/^[a-z0-9-]+$/)
  key!: string;

  @IsString()
  host!: string;

  @IsString()
  name!: string;
}

export class CredentialDto {
  @IsString()
  @MaxLength(200)
  password!: string;
}
