import { Module } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { CommissionsService } from './commissions.service'
import { CommissionsController } from './commissions.controller'
import { CommissionFormulasModule } from '../commission-formulas/commission-formulas.module'

@Module({
  imports: [PrismaModule, CommissionFormulasModule],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
