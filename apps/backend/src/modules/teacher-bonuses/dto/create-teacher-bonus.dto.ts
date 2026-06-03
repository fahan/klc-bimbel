import { IsString, IsNumber, IsInt, Min, Max, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateTeacherBonusDto {
  @ApiProperty({ description: 'Branch ID' })
  @IsString()
  branchId!: string

  @ApiProperty({ description: 'Teacher (user) ID' })
  @IsString()
  teacherId!: string

  @ApiProperty({ description: 'Month (1-12)', example: 6 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number

  @ApiProperty({ description: 'Year', example: 2026 })
  @IsInt()
  @Min(2020)
  year!: number

  @ApiProperty({ description: 'Bonus amount in IDR', example: 500000 })
  @IsNumber()
  @Min(1)
  amount!: number

  @ApiProperty({ description: 'Reason / keterangan bonus', example: 'Bonus Lebaran' })
  @IsString()
  @MinLength(3)
  reason!: string
}
