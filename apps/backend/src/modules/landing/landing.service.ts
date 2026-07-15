import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import { PrismaService } from '../../prisma/prisma.service'
import { TtlCacheService } from '../../common/cache/ttl-cache.service'
import { LANDING_CACHE_KEYS } from '../../common/cache/cache-keys'
import { CreateRegistrationDto } from './dto/create-registration.dto'
import { UpdateRegistrationDto } from './dto/update-registration.dto'

const BUCKET = 'landing-images'
// Public landing reads are near-static and hit on every visitor / admin page load.
// Cache them briefly; content writes invalidate explicitly, rate/branch edits
// (in other modules) surface within this TTL.
const PUBLIC_TTL_MS = 60_000

@Injectable()
export class LandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: TtlCacheService,
  ) {}

  private get supabase() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new BadRequestException('Supabase env vars not configured')
    return createClient(url, key)
  }

  // ─── Free Trial Registration ──────────────────────────────────────────────

  async submitRegistration(dto: CreateRegistrationDto) {
    const registration = await this.prisma.freeTrialRegistration.create({
      data: {
        childName: dto.childName,
        parentName: dto.parentName,
        phone: dto.phone,
        grade: dto.grade,
        subjects: dto.subjects,
        branchCode: dto.branchCode,
        notes: dto.notes,
      },
    })

    return {
      success: true,
      data: registration,
      message: 'Pendaftaran berhasil! Tim kami akan menghubungi Anda via WhatsApp dalam 24 jam.',
    }
  }

  async getRegistrations(status?: string, branchCode?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (status) where.status = status
    if (branchCode) where.branchCode = branchCode

    const [items, total] = await Promise.all([
      this.prisma.freeTrialRegistration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.freeTrialRegistration.count({ where }),
    ])

    return {
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  async updateRegistration(id: string, dto: UpdateRegistrationDto) {
    const registration = await this.prisma.freeTrialRegistration.update({
      where: { id },
      data: dto,
    })
    return { success: true, data: registration }
  }

  // ─── Landing Content CMS ─────────────────────────────────────────────────

  async getAllContent() {
    return this.cache.wrap(`${LANDING_CACHE_KEYS.contentPrefix}all`, PUBLIC_TTL_MS, async () => {
      const rows = await this.prisma.landingContent.findMany({
        orderBy: { section: 'asc' },
      })
      const result: Record<string, any> = {}
      for (const row of rows) {
        result[row.section] = row.content
      }
      return { success: true, data: result }
    })
  }

  async getContentSection(section: string) {
    return this.cache.wrap(`${LANDING_CACHE_KEYS.contentPrefix}section:${section}`, PUBLIC_TTL_MS, async () => {
      const row = await this.prisma.landingContent.findUnique({ where: { section } })
      if (!row) throw new NotFoundException(`Section "${section}" tidak ditemukan`)
      return { success: true, data: row.content }
    })
  }

  async upsertContentSection(section: string, content: any, updatedById?: string) {
    const row = await this.prisma.landingContent.upsert({
      where: { section },
      update: { content, updatedById },
      create: { section, content, updatedById },
    })
    // Invalidate cached content so the edit is reflected immediately.
    this.cache.deleteByPrefix(LANDING_CACHE_KEYS.contentPrefix)
    return { success: true, data: row, message: `Section "${section}" berhasil disimpan.` }
  }

  // ─── Public SPP Rates ────────────────────────────────────────────────────

  async getPublicSppRates() {
    return this.cache.wrap(LANDING_CACHE_KEYS.sppRates, PUBLIC_TTL_MS, () => this._getPublicSppRates())
  }

  private async _getPublicSppRates() {
    // Use raw SQL to avoid Prisma client cache issues with new columns
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string
        name: string
        code: string
        sessions_per_month: number
        amount: string | null
        rate_id: string | null
      }>
    >`
      SELECT
        s.id,
        s.name,
        s.code,
        COALESCE(s.sessions_per_month, 8) AS sessions_per_month,
        r.amount,
        r.id AS rate_id
      FROM subjects s
      LEFT JOIN LATERAL (
        SELECT id, amount
        FROM spp_rates
        WHERE "subjectId" = s.id
          AND type = 'REGULAR'
          AND "effectiveFrom" <= NOW()
          AND ("effectiveUntil" IS NULL OR "effectiveUntil" >= NOW())
        ORDER BY "effectiveFrom" DESC
        LIMIT 1
      ) r ON true
      WHERE s."isActive" = true
      ORDER BY s."createdAt" ASC
    `

    const result = rows
      .filter((r) => r.amount !== null)
      .map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        sessionsPerMonth: Number(r.sessions_per_month),
        amount: Number(r.amount),
        rateId: r.rate_id,
      }))

    return { success: true, data: result }
  }

  // ─── Public Branch List ───────────────────────────────────────────────────

  async getPublicBranches() {
    return this.cache.wrap(LANDING_CACHE_KEYS.branches, PUBLIC_TTL_MS, () => this._getPublicBranches())
  }

  private async _getPublicBranches() {
    // Fetch branches + all active-student counts in 2 queries (was 1 + N: a
    // student.count per branch). groupBy returns counts for all branches at once.
    const [branches, counts] = await Promise.all([
      this.prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.student.groupBy({
        by: ['branchId'],
        where: { isActive: true },
        _count: { _all: true },
      }),
    ])

    const countByBranch = new Map(counts.map((c) => [c.branchId, c._count._all]))

    const withCounts = branches.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      address: b.address,
      phone: b.phone,
      studentCount: countByBranch.get(b.id) ?? 0,
    }))

    return { success: true, data: withCounts }
  }

  // ─── Image Upload ─────────────────────────────────────────────────────────

  async uploadImage(file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      })

    if (error) throw new BadRequestException(`Upload gagal: ${error.message}`)

    const { data: { publicUrl } } = this.supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path)

    return { success: true, data: { url: publicUrl, path: data.path } }
  }

  async deleteImage(path: string) {
    const { error } = await this.supabase.storage.from(BUCKET).remove([path])
    if (error) throw new BadRequestException(`Hapus gagal: ${error.message}`)
    return { success: true, message: 'Foto berhasil dihapus.' }
  }
}
