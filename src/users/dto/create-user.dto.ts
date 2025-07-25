import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Role } from '../entities/user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({
    description: 'first name of the user',
    example: 'User1',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'last name of the user',
    example: 'name1',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'email address of the user',
    example: 'user1@eexample.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'phone number of the user',
    example: '+254789471918',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'password of the user',
    example: 'Password!@123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'role of the user',
    example: 'customer',
  })
  @IsString()
  @IsEnum(Role, {
    message: 'Role must be one of the following: admin, driver,customer ',
  })
  role: Role = Role.CUSTOMER;

  @IsOptional()
  @IsDateString()
  created_at?: Date;

  @IsOptional()
  @IsDateString()
  updated_at?: Date;
}
