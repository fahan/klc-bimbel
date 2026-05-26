import { Module } from '@nestjs/common'
import { LandingController } from './landing.controller'
import { LandingService } from './landing.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
