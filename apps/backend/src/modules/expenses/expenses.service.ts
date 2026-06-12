import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExpenseDto, userId: string) {
    const expense = await this.prisma.expense.create({
      relationLoadStrategy: 'join',
      data: {
        branchId: dto.branchId,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        date: new Date(dto.date),
        notes: dto.notes,
        recordedById: userId,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    })
    return { success: true, data: this.format(expense) }
  }

  async findAll(filters: { branchId?: string; month?: number; year?: number; category?: string }) {
    const where: any = {}

    if (filters.branchId) where.branchId = filters.branchId

    if (filters.month && filters.year) {
      const start = new Date(filters.year, filters.month - 1, 1)
      const end = new Date(filters.year, filters.month, 1)
      where.date = { gte: start, lt: end }
    } else if (filters.year) {
      const start = new Date(filters.year, 0, 1)
      const end = new Date(filters.year + 1, 0, 1)
      where.date = { gte: start, lt: end }
    }

    if (filters.category) where.category = filters.category

    const expenses = await this.prisma.expense.findMany({
      relationLoadStrategy: 'join',
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    })

    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)

    return {
      success: true,
      data: expenses.map(e => this.format(e)),
      meta: { total, count: expenses.length },
    }
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      relationLoadStrategy: 'join',
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    })
    if (!expense) throw new NotFoundException('Pengeluaran tidak ditemukan')
    return { success: true, data: this.format(expense) }
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.findOne(id)
    const updated = await this.prisma.expense.update({
      relationLoadStrategy: 'join',
      where: { id },
      data: {
        ...(dto.category && { category: dto.category }),
        ...(dto.description && { description: dto.description }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    })
    return { success: true, data: this.format(updated) }
  }

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.expense.delete({ where: { id } })
    return { success: true, message: 'Pengeluaran berhasil dihapus' }
  }

  async getSummary(branchId: string | undefined, month: number, year: number) {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)
    const branchFilter = branchId ? { branchId } : {}

    const [operational, asset] = await Promise.all([
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { ...branchFilter, category: 'OPERATIONAL', date: { gte: start, lt: end } },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { ...branchFilter, category: 'ASSET', date: { gte: start, lt: end } },
      }),
    ])

    const operationalTotal = parseFloat((operational._sum.amount || 0).toString())
    const assetTotal = parseFloat((asset._sum.amount || 0).toString())

    return {
      operational: operationalTotal,
      asset: assetTotal,
      total: operationalTotal + assetTotal,
    }
  }

  private format(expense: any) {
    return {
      id: expense.id,
      branchId: expense.branchId,
      branch: expense.branch,
      category: expense.category,
      description: expense.description,
      amount: parseFloat(expense.amount.toString()),
      date: expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : expense.date,
      notes: expense.notes,
      recordedBy: expense.recordedBy,
      createdAt: expense.createdAt,
    }
  }
}
