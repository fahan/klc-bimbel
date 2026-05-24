import { Module } from '@nestjs/common'
import { CurriculumModulesService } from './curriculum-modules.service'
import { CurriculumModulesController } from './curriculum-modules.controller'
import { PrismaModule } from '@/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CurriculumModulesController],
  providers: [CurriculumModulesService],
  exports: [CurriculumModulesService],
})
export class CurriculumModulesModule {}
