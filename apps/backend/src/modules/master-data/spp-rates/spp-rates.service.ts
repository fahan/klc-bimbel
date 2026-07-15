import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateSppRateDto } from './dto/create-spp-rate.dto'
import { UpdateSppRateDto } from './dto/update-spp-rate.dto'
import { Decimal } from '@prisma/client/runtime/library'
import { PaginationMeta } from '@/common/dto/pagination.dto'
import { TtlCacheService } from '@/common/cache/ttl-cache.service'
import { LANDING_CACHE_KEYS } from '@/common/cache/cache-keys'

@Injectable()
export class SppRatesService {
  constructor(
    private prisma: PrismaService,
    private cache: TtlCacheService,
  ) {}

  async findAll(page: number = 1, limit: number = 10, filters?: { subjectId?: string }) {
    const skip = (page - 1) * limit

    const [sppRates, total] = await Promise.all([
      this.prisma.sppRate.findMany({
        relationLoadStrategy: 'join',
        where: {
          ...(filters?.subjectId && { subjectId: filters.subjectId }),
        },
        include: {
          subject: true,
        },
        orderBy: [{ subjectId: 'asc' }, { effectiveFrom: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.sppRate.count({
        where: {
          ...(filters?.subjectId && { subjectId: filters.subjectId }),
        },
      }),
    ])

    const totalPages = Math.ceil(total / limit)
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }

    return {
      success: true,
      data: sppRates.map(rate => this.formatSppRate(rate)),
      pagination,
    }
  }

  async findOne(id: string) {
    const sppRate = await this.prisma.sppRate.findUnique({
      relationLoadStrategy: 'join',
      where: { id },
      include: {
        subject: true,
      },
    })

    if (!sppRate) {
      throw new NotFoundException('SPP Rate not found')
    }

    return {
      success: true,
      data: this.formatSppRate(sppRate),
    }
  }

  async findBySubject(subjectId: string) {
    const sppRates = await this.prisma.sppRate.findMany({
      where: {
        subjectId,
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    return {
      success: true,
      data: sppRates.map(rate => this.formatSppRate(rate)),
    }
  }

  async findActiveRate(subjectId: string, type: string, billingType?: string, date?: Date) {
    const checkDate = date || new Date()

    const sppRate = await this.prisma.sppRate.findFirst({
      where: {
        subjectId,
        type: type as any,
        ...(billingType && { billingType: billingType as any }),
        effectiveFrom: { lte: checkDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: checkDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    if (!sppRate) {
      throw new NotFoundException('No active SPP rate found for the specified criteria')
    }

    return {
      success: true,
      data: this.formatSppRate(sppRate),
    }
  }

  async create(createSppRateDto: CreateSppRateDto) {
    // Verify subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: createSppRateDto.subjectId },
    })
    if (!subject) {
      throw new BadRequestException('Subject not found')
    }

    // Validate date range
    const effectiveFrom = new Date(createSppRateDto.effectiveFrom)
    if (createSppRateDto.effectiveUntil) {
      const effectiveUntil = new Date(createSppRateDto.effectiveUntil)
      if (effectiveFrom >= effectiveUntil) {
        throw new BadRequestException('effectiveFrom must be before effectiveUntil')
      }
    }

    const sppRate = await this.prisma.sppRate.create({
      relationLoadStrategy: 'join',
      data: {
        subjectId: createSppRateDto.subjectId,
        type: createSppRateDto.type,
        billingType: createSppRateDto.billingType ?? 'FLAT_MONTHLY',
        amount: new Decimal(createSppRateDto.amount),
        effectiveFrom,
        effectiveUntil: createSppRateDto.effectiveUntil ? new Date(createSppRateDto.effectiveUntil) : null,
      },
      include: {
        subject: true,
      },
    })

    // Public /landing/spp-rates is derived from active REGULAR rates — invalidate it.
    this.cache.delete(LANDING_CACHE_KEYS.sppRates)

    return {
      success: true,
      data: this.formatSppRate(sppRate),
      message: 'SPP Rate created successfully',
    }
  }

  async update(id: string, updateSppRateDto: UpdateSppRateDto) {
    const sppRate = await this.prisma.sppRate.findUnique({
      where: { id },
    })

    if (!sppRate) {
      throw new NotFoundException('SPP Rate not found')
    }

    // Verify subject if being updated
    if (updateSppRateDto.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: updateSppRateDto.subjectId },
      })
      if (!subject) {
        throw new BadRequestException('Subject not found')
      }
    }

    // Validate date range if dates are being updated
    if (updateSppRateDto.effectiveFrom || updateSppRateDto.effectiveUntil) {
      const effectiveFrom = updateSppRateDto.effectiveFrom ? new Date(updateSppRateDto.effectiveFrom) : sppRate.effectiveFrom
      const effectiveUntil = updateSppRateDto.effectiveUntil
        ? new Date(updateSppRateDto.effectiveUntil)
        : sppRate.effectiveUntil

      if (effectiveUntil && effectiveFrom >= effectiveUntil) {
        throw new BadRequestException('effectiveFrom must be before effectiveUntil')
      }
    }

    const updated = await this.prisma.sppRate.update({
      relationLoadStrategy: 'join',
      where: { id },
      data: {
        subjectId: updateSppRateDto.subjectId || sppRate.subjectId,
        type: updateSppRateDto.type || sppRate.type,
        billingType: updateSppRateDto.billingType || sppRate.billingType,
        amount: updateSppRateDto.amount !== undefined ? new Decimal(updateSppRateDto.amount) : sppRate.amount,
        effectiveFrom: updateSppRateDto.effectiveFrom ? new Date(updateSppRateDto.effectiveFrom) : sppRate.effectiveFrom,
        effectiveUntil: updateSppRateDto.effectiveUntil ? new Date(updateSppRateDto.effectiveUntil) : sppRate.effectiveUntil,
      },
      include: {
        subject: true,
      },
    })

    this.cache.delete(LANDING_CACHE_KEYS.sppRates)

    return {
      success: true,
      data: this.formatSppRate(updated),
      message: 'SPP Rate updated successfully',
    }
  }

  async remove(id: string) {
    const sppRate = await this.prisma.sppRate.findUnique({
      where: { id },
    })

    if (!sppRate) {
      throw new NotFoundException('SPP Rate not found')
    }

    await this.prisma.sppRate.delete({
      where: { id },
    })

    this.cache.delete(LANDING_CACHE_KEYS.sppRates)

    return {
      success: true,
      data: null,
      message: 'SPP Rate deleted successfully',
    }
  }

  private formatSppRate(sppRate: any) {
    return {
      id: sppRate.id,
      subjectId: sppRate.subjectId,
      type: sppRate.type,
      billingType: sppRate.billingType,
      amount: sppRate.amount.toString(),
      effectiveFrom: sppRate.effectiveFrom.toISOString(),
      effectiveUntil: sppRate.effectiveUntil ? sppRate.effectiveUntil.toISOString() : null,
      createdAt: sppRate.createdAt.toISOString(),
      ...(sppRate.subject && { subject: sppRate.subject }),
    }
  }
}
