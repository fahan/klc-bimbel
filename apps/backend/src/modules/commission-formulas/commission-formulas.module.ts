import { Module } from '@nestjs/common'
import { CommissionFormulasController } from './commission-formulas.controller'
import { CommissionFormulasService } from './commission-formulas.service'
import { PrismaModule } from '@/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CommissionFormulasController],
  providers: [CommissionFormulasService],
  exports: [CommissionFormulasService],
})
export class CommissionFormulasModule {}
