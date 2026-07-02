import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { THROTTLER_CONFIG } from './common/config/throttler.config'
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
import { CommissionFormulasModule } from './modules/commission-formulas/commission-formulas.module'
import { TeacherBonusesModule } from './modules/teacher-bonuses/teacher-bonuses.module'
import { ProgressReportsModule } from './modules/progress-reports/progress-reports.module'
import { FinanceModule } from './modules/finance/finance.module'
import { StoreModule } from './modules/store/store.module'
import { MailModule } from './modules/mail/mail.module'
import { LandingModule } from './modules/landing/landing.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { ExpensesModule } from './modules/expenses/expenses.module'
import { AppSettingsModule } from './modules/app-settings/app-settings.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot(THROTTLER_CONFIG),
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
    CommissionFormulasModule,
    TeacherBonusesModule,
    ProgressReportsModule,
    FinanceModule,
    StoreModule,
    MailModule,
    LandingModule,
    DashboardModule,
    ExpensesModule,
    AppSettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
