import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateCriteriaCategoryDto {
  @IsString() value!: string;
  @IsString() label!: string;
  @IsInt() @IsOptional() order?: number;
}

export class UpdateCriteriaCategoryDto {
  @IsString() @IsOptional() value?: string;
  @IsString() @IsOptional() label?: string;
  @IsInt() @IsOptional() order?: number;
}