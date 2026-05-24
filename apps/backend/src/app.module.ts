import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { MasterDataModule } from './modules/master-data/master-data.module'
import { StudentsModule } from './modules/students/students.module'
import { TeachersModule } from './modules/teachers/teachers.module'
import { UsersModule } from './modules/users/users.module'
import { SessionsModule } from './modules/sessions/sessions.module'
import { AttendanceModule } from './modules/attendance/attendance.module'
import { ProgressModule } from './modules/progress/progress.module'
import { InvoicesModule } from './modules/invoices/invoices.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { CommissionsModule } from './modules/commissions/commissions.module'
import { ProgressReportsModule } from './modules/progress-reports/progress-reports.module'
import { FinanceModule } from './modules/finance/finance.module'
import { StoreModule } from './modules/store/store.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    MasterDataModule,
    StudentsModule,
    TeachersModule,
    UsersModule,
    SessionsModule,
    AttendanceModule,
    ProgressModule,
    InvoicesModule,
    PaymentsModule,
    CommissionsModule,
    ProgressReportsModule,
    FinanceModule,
    StoreModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
