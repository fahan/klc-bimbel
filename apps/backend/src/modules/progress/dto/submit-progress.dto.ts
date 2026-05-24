import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsInt, Min, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export enum Predicate {
  PERLU_BIMBINGAN = 'PERLU_BIMBINGAN',
  CUKUP = 'CUKUP',
  BAIK = 'BAIK',
  BAIK_SEKALI = 'BAIK_SEKALI',
  MEMUASKAN = 'MEMUASKAN',
}

// For MODULE_BASED tracking type
export class ModuleProgressDto {
  @ApiProperty({ example: 'student_id_123' })
  @IsString()
  studentId!: string

  @ApiProperty({ example: 'module_id_123' })
  @IsString()
  moduleId!: string

  @ApiProperty({ example: 1, description: 'Chapter from (start)' })
  @IsInt()
  @Min(1)
  chapterFrom!: number

  @ApiProperty({ example: 3, description: 'Chapter to (end)' })
  @IsInt()
  @Min(1)
  chapterTo!: number

  @ApiProperty({ example: false, description: 'Whether this completes the module' })
  @IsBoolean()
  moduleCompleted!: boolean

  @ApiProperty({ enum: Predicate, required: false, description: 'Required if moduleCompleted is true' })
  @IsOptional()
  @IsEnum(Predicate)
  predicate?: Predicate

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string
}

// For FREE_MATERIAL tracking type
export class FreeMaterialStudentProgressDto {
  @ApiProperty({ example: 'student_id_123' })
  @IsString()
  studentId!: string

  @ApiProperty({ enum: Predicate })
  @IsEnum(Predicate)
  predicate!: Predicate

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string
}

export class SubmitProgressDto {
  @ApiProperty({ example: 'session_log_id_123' })
  @IsString()
  sessionLogId!: string

  @ApiProperty({
    enum: ['MODULE_BASED', 'FREE_MATERIAL'],
    description: 'Tracking type from subject master data',
  })
  @IsEnum(['MODULE_BASED', 'FREE_MATERIAL'])
  trackingType!: 'MODULE_BASED' | 'FREE_MATERIAL'

  // For MODULE_BASED
  @ApiProperty({ type: [ModuleProgressDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleProgressDto)
  moduleProgress?: ModuleProgressDto[]

  // For FREE_MATERIAL
  @ApiProperty({ required: false, description: 'Topic taught (one for all students)' })
  @IsOptional()
  @IsString()
  topic?: string

  @ApiProperty({ type: [FreeMaterialStudentProgressDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FreeMaterialStudentProgressDto)
  freeMaterialProgress?: FreeMaterialStudentProgressDto[]
}
