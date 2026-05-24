import { IsString, IsArray, IsOptional, IsInt, Min, ArrayMinSize } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateReportLinkDto {
  @ApiProperty({ example: 'student_id_123' })
  @IsString()
  studentId!: string

  @ApiProperty({
    example: ['subject_id_1', 'subject_id_2'],
    description: 'Subject IDs to include in the report. Must be subjects student is enrolled in.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subjectIds!: string[]

  @ApiProperty({
    example: 30,
    description: 'Validity duration in days. Use 0 or omit for permanent link.',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationDays?: number
}
