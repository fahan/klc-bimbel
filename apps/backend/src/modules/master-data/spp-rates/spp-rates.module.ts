import { Module } from '@nestjs/common'
import { SppRatesService } from './spp-rates.service'
import { SppRatesController } from './spp-rates.controller'
import { PrismaModule } from '@/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [SppRatesController],
  providers: [SppRatesService],
  exports: [SppRatesService],
})
export class SppRatesModule {}
