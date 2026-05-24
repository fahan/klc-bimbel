import { IsString, IsEnum, IsInt, Min, Max, Matches, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { DayOfWeek, SessionType } from './create-session.dto'

export class UpdateSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  branchId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subjectId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  teacherId?: string

  @ApiProperty({ enum: SessionType, required: false })
  @IsOptional()
  @IsEnum(SessionType)
  type?: SessionType

  @ApiProperty({ enum: DayOfWeek, required: false })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek

  @ApiProperty({ required: false, example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(240)
  durationMinutes?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
