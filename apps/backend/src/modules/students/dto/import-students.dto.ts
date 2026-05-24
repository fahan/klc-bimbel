import { ApiProperty } from '@nestjs/swagger'
import { Readable } from 'stream'

export class ImportStudentsDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CSV file dengan format: name,classLevel,parentName,parentPhone,branchId',
  })
  file!: {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    buffer: Buffer
    size: number
  }
}

export interface ImportStudentRow {
  name: string
  classLevel?: string
  parentName?: string
  parentPhone?: string
  branchId: string
}

export interface ImportStudentResult {
  success: boolean
  total: number
  imported: number
  failed: number
  errors: Array<{
    row: number
    data: ImportStudentRow
    error: string
  }>
}
