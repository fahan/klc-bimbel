import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { UpsertCommissionFormulaDto } from './dto/upsert-commission-formula.dto'

@Injectable()
export class CommissionFormulasService {
  constructor(private prisma: PrismaService) {}

  async findAll(subjectId?: string) {
    const subjects = await this.prisma.subject.findMany({
      relationLoadStrategy: 'join',
      where: {
        isActive: true,
        ...(subjectId && { id: subjectId }),
      },
      include: {
        commissionFormulas: true,
      },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      data: subjects.map(s => ({
        subjectId: s.id,
        subjectName: s.name,
        subjectCode: s.code,
        defaultCommissionPercentage: parseFloat(s.commissionPercentage.toString()),
        formulas: {
          REGULAR: this.resolveFormula(s, 'REGULAR'),
          PRIVATE: this.resolveFormula(s, 'PRIVATE'),
        },
      })),
    }
  }

  private resolveFormula(
    subject: any,
    sessionType: 'REGULAR' | 'PRIVATE',
  ) {
    const custom = subject.commissionFormulas.find(
      (f: any) => f.sessionType === sessionType && f.isActive,
    )
    if (custom) {
      return {
        formulaType: custom.formulaType,
        commissionPercentage: parseFloat(custom.commissionPercentage.toString()),
        isCustom: true,
        id: custom.id,
      }
    }
    return {
      formulaType: 'MONTHLY_RATE' as const,
      commissionPercentage: parseFloat(subject.commissionPercentage.toString()),
      isCustom: false,
      id: null,
    }
  }

  async upsert(subjectId: string, dto: UpsertCommissionFormulaDto) {
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } })
    if (!subject) throw new NotFoundException('Subject not found')

    const formula = await this.prisma.subjectCommissionFormula.upsert({
      where: {
        subjectId_sessionType: {
          subjectId,
          sessionType: dto.sessionType,
        },
      },
      create: {
        subjectId,
        sessionType: dto.sessionType,
        formulaType: dto.formulaType,
        commissionPercentage: dto.commissionPercentage,
        isActive: dto.isActive ?? true,
      },
      update: {
        formulaType: dto.formulaType,
        commissionPercentage: dto.commissionPercentage,
        isActive: dto.isActive ?? true,
      },
    })

    return {
      success: true,
      data: {
        id: formula.id,
        subjectId: formula.subjectId,
        sessionType: formula.sessionType,
        formulaType: formula.formulaType,
        commissionPercentage: parseFloat(formula.commissionPercentage.toString()),
        isActive: formula.isActive,
      },
      message: 'Formula komisi berhasil disimpan',
    }
  }

  async remove(subjectId: string, sessionType: 'REGULAR' | 'PRIVATE') {
    const formula = await this.prisma.subjectCommissionFormula.findUnique({
      where: { subjectId_sessionType: { subjectId, sessionType } },
    })
    if (!formula) throw new NotFoundException('Formula tidak ditemukan')

    await this.prisma.subjectCommissionFormula.delete({
      where: { subjectId_sessionType: { subjectId, sessionType } },
    })

    return {
      success: true,
      message: `Formula ${sessionType} direset ke default`,
    }
  }

  /**
   * Used by CommissionsService during calculation.
   * Returns effective formula for a given subject+sessionType.
   */
  async getEffectiveFormula(subjectId: string, sessionType: 'REGULAR' | 'PRIVATE') {
    const custom = await this.prisma.subjectCommissionFormula.findUnique({
      where: {
        subjectId_sessionType: { subjectId, sessionType },
      },
    })

    if (custom && custom.isActive) {
      return {
        formulaType: custom.formulaType as 'MONTHLY_RATE' | 'PER_SESSION',
        commissionPercentage: parseFloat(custom.commissionPercentage.toString()),
      }
    }

    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } })
    return {
      formulaType: 'MONTHLY_RATE' as const,
      commissionPercentage: subject
        ? parseFloat(subject.commissionPercentage.toString())
        : 0.4,
    }
  }
}
