import { IsString, IsInt, Min, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class TransferStockDto {
  @ApiProperty({ example: 'product_id_123', description: 'Source product ID (in source branch)' })
  @IsString()
  productId!: string

  @ApiProperty({ example: 'branch_id_dest_123', description: 'Destination branch ID' })
  @IsString()
  destinationBranchId!: string

  @ApiProperty({ example: 20, description: 'Quantity to transfer' })
  @IsInt()
  @Min(1)
  quantity!: number

  @ApiProperty({ required: false, example: 'Stok cabang Bandung kekurangan' })
  @IsOptional()
  @IsString()
  notes?: string
}
