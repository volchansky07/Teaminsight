import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  roleId: string;
}
