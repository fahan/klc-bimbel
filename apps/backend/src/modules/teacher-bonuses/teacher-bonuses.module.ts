import { Module } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { TeacherBonusesController } from './teacher-bonuses.controller'
import { TeacherBonusesService } from './teacher-bonuses.service'

@Module({
  imports: [PrismaModule],
  controllers: [TeacherBonusesController],
  providers: [TeacherBonusesService],
  exports: [TeacherBonusesService],
})
export class TeacherBonusesModule {}
