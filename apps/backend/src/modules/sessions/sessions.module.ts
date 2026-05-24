import { Module } from '@nestjs/common'
import { PrismaModule } from '@/prisma/prisma.module'
import { SessionsService } from './sessions.service'
import { SessionsController } from './sessions.controller'

@Module({
  imports: [PrismaModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
