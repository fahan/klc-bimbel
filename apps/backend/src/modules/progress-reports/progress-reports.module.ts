import { Module } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { ProgressReportsService } from './progress-reports.service'
import { ProgressReportsController } from './progress-reports.controller'

@Module({
  imports: [PrismaModule],
  controllers: [ProgressReportsController],
  providers: [ProgressReportsService],
  exports: [ProgressReportsService],
})
export class ProgressReportsModule {}
