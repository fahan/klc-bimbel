import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateTeacherBonusDto } from './dto/create-teacher-bonus.dto'
import { UpdateTeacherBonusDto } from './dto/update-teacher-bonus.dto'

@Injectable()
export class TeacherBonusesService {
  constructor(private prisma: PrismaService) {}

  private formatBonus(b: any) {
    return {
      id: b.id,
      branchId: b.branchId,
      branchName: b.branch?.name,
      teacherId: b.teacherId,
      teacherName: b.teacher?.name,
      month: b.month,
      year: b.year,
      amount: b.amount.toString(),
      reason: b.reason,
      status: b.status,
      createdByName: b.createdBy?.name,
      approvedByName: b.approvedBy?.name,
      approvedAt: b.approvedAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
    }
  }

  async create(dto: CreateTeacherBonusDto, createdById: string) {
    const [branch, teacher] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
      this.prisma.user.findUnique({ where: { id: dto.teacherId } }),
    ])
    if (!branch) throw new NotFoundException('Cabang tidak ditemukan')
    if (!teacher) throw new NotFoundException('Guru tidak ditemukan')

    const bonus = await this.prisma.teacherBonus.create({
      relationLoadStrategy: 'join',
      data: {
        branchId: dto.branchId,
        teacherId: dto.teacherId,
        month: dto.month,
        year: dto.year,
        amount: dto.amount,
        reason: dto.reason,
        createdById,
      },
      include: { branch: true, teacher: true, createdBy: true, approvedBy: true },
    })

    return {
      success: true,
      data: this.formatBonus(bonus),
      message: 'Bonus berhasil ditambahkan',
    }
  }

  async findAll(branchId: string, month: number, year: number) {
    const bonuses = await this.prisma.teacherBonus.findMany({
      relationLoadStrategy: 'join',
      where: { branchId, month, year },
      include: { branch: true, teacher: true, createdBy: true, approvedBy: true },
      orderBy: [{ teacher: { name: 'asc' } }, { createdAt: 'asc' }],
    })

    const data = bonuses.map(b => this.formatBonus(b))
    const totalDraft = data
      .filter(b => b.status === 'DRAFT')
      .reduce((s, b) => s + parseFloat(b.amount), 0)
    const totalApproved = data
      .filter(b => b.status === 'APPROVED')
      .reduce((s, b) => s + parseFloat(b.amount), 0)

    return {
      success: true,
      data: {
        bonuses: data,
        metrics: {
          totalDraft: totalDraft.toFixed(2),
          totalApproved: totalApproved.toFixed(2),
          count: data.length,
        },
      },
    }
  }

  async findByTeacher(teacherId: string, year?: number) {
    const bonuses = await this.prisma.teacherBonus.findMany({
      relationLoadStrategy: 'join',
      where: { teacherId, ...(year && { year }) },
      include: { branch: true, approvedBy: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return {
      success: true,
      data: bonuses.map(b => this.formatBonus(b)),
    }
  }

  async update(id: string, dto: UpdateTeacherBonusDto) {
    const bonus = await this.prisma.teacherBonus.findUnique({ where: { id } })
    if (!bonus) throw new NotFoundException('Bonus tidak ditemukan')
    if (bonus.status === 'APPROVED') {
      throw new BadRequestException('Bonus yang sudah disetujui tidak bisa diedit')
    }

    const updated = await this.prisma.teacherBonus.update({
      relationLoadStrategy: 'join',
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
      },
      include: { branch: true, teacher: true, createdBy: true, approvedBy: true },
    })

    return {
      success: true,
      data: this.formatBonus(updated),
      message: 'Bonus berhasil diperbarui',
    }
  }

  async remove(id: string) {
    const bonus = await this.prisma.teacherBonus.findUnique({ where: { id } })
    if (!bonus) throw new NotFoundException('Bonus tidak ditemukan')
    if (bonus.status === 'APPROVED') {
      throw new BadRequestException('Bonus yang sudah disetujui tidak bisa dihapus')
    }

    await this.prisma.teacherBonus.delete({ where: { id } })
    return { success: true, message: 'Bonus berhasil dihapus' }
  }

  async approve(id: string, approvedById: string) {
    const bonus = await this.prisma.teacherBonus.findUnique({ where: { id } })
    if (!bonus) throw new NotFoundException('Bonus tidak ditemukan')
    if (bonus.status === 'APPROVED') {
      throw new BadRequestException('Bonus sudah disetujui sebelumnya')
    }

    const updated = await this.prisma.teacherBonus.update({
      relationLoadStrategy: 'join',
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
      include: { branch: true, teacher: true, createdBy: true, approvedBy: true },
    })

    return {
      success: true,
      data: this.formatBonus(updated),
      message: `Bonus untuk ${updated.teacher.name} telah disetujui`,
    }
  }
}
