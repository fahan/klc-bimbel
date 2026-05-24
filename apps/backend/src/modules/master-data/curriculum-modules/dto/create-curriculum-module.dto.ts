import { IsString, IsNumber, Min, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateCurriculumModuleDto {
  @ApiProperty({ example: '60db5e97-c2f8-4ab7-8c51-d3a3c4f1c5e2' })
  @IsString()
  subjectId!: string

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  orderNumber!: number

  @ApiProperty({ example: 'Bab 1: Bilangan Bulat' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  totalChapters!: number
}
