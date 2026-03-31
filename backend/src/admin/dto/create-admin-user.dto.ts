import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  @Length(3, 150)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsIn(['USER', 'SUPER_ADMIN'])
  systemRole!: 'USER' | 'SUPER_ADMIN';
}
