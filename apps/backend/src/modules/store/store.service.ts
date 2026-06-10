import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateProductDto, UpdateProductDto } from './dto/product.dto'
import { CreateSaleDto, RestockDto } from './dto/sale.dto'
import { TransferStockDto } from './dto/transfer.dto'

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  // ============== PRODUCTS ==============
  async findAllProducts(filters?: {
    branchId?: string
    category?: string
    lowStock?: boolean
    search?: string
    page?: number
    limit?: number
  }) {
    const page = Math.max(1, filters?.page || 1)
    const limit = Math.min(100, Math.max(1, filters?.limit || 10))
    const skip = (page - 1) * limit

    const baseWhere: any = {
      isActive: true,
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.category && { category: filters.category as any }),
      ...(filters?.search && {
        name: { contains: filters.search, mode: 'insensitive' },
      }),
    }

    // lowStock filter requires column comparison (stock <= minStock) which
    // Prisma can't do in WHERE natively — fetch all and filter in memory
    if (filters?.lowStock) {
      const all = await this.prisma.product.findMany({
        where: baseWhere,
        include: { branch: true },
        orderBy: { name: 'asc' },
      })
      const items = all
        .map(p => this.formatProduct(p))
        .filter(p => p.stockStatus === 'LOW' || p.stockStatus === 'OUT')
      return {
        success: true,
        data: { data: items, total: items.length, page: 1, limit: items.length || 1, totalPages: 1 },
      }
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: baseWhere,
        include: { branch: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: baseWhere }),
    ])

    return {
      success: true,
      data: {
        data: products.map(p => this.formatProduct(p)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findOneProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { branch: true },
    })
    if (!product) throw new NotFoundException('Product not found')

    return {
      success: true,
      data: this.formatProduct(product),
    }
  }

  async createProduct(dto: CreateProductDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } })
    if (!branch) throw new BadRequestException('Branch not found')

    const product = await this.prisma.product.create({
      data: {
        branchId: dto.branchId,
        name: dto.name,
        category: dto.category as any,
        price: dto.price,
        stock: dto.stock,
        minStock: dto.minStock,
        isActive: true,
      },
      include: { branch: true },
    })

    return {
      success: true,
      data: this.formatProduct(product),
      message: 'Product created successfully',
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Product not found')

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        category: (dto.category as any) ?? existing.category,
        price: dto.price ?? existing.price,
        minStock: dto.minStock ?? existing.minStock,
        isActive: dto.isActive ?? existing.isActive,
      },
      include: { branch: true },
    })

    return {
      success: true,
      data: this.formatProduct(updated),
      message: 'Product updated successfully',
    }
  }

  async getProductMetrics(branchId?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(branchId && { branchId }),
      },
    })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const sales = await this.prisma.sale.findMany({
      where: {
        ...(branchId && { branchId }),
        createdAt: { gte: startOfMonth },
      },
    })

    const lowStock = products.filter(p => p.stock <= p.minStock && p.stock > 0).length
    const outOfStock = products.filter(p => p.stock === 0).length
    const categories = new Set(products.map(p => p.category)).size
    const monthlyTotal = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0)

    return {
      success: true,
      data: {
        totalProducts: products.length,
        categoriesCount: categories,
        lowStockCount: lowStock,
        outOfStockCount: outOfStock,
        monthlyRevenue: monthlyTotal,
        monthlySalesCount: sales.length,
      },
    }
  }

  // ============== SALES (POS) ==============
  async createSale(dto: CreateSaleDto, currentUserId: string) {
    // Verify branch
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } })
    if (!branch) throw new BadRequestException('Branch not found')

    // Verify all products exist + have enough stock
    const items: any[] = []
    let totalAmount = 0

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) throw new BadRequestException(`Product ${item.productId} not found`)
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock tidak cukup untuk ${product.name} (tersedia: ${product.stock}, diminta: ${item.quantity})`,
        )
      }

      const unitPrice = parseFloat(product.price.toString())
      const subtotal = unitPrice * item.quantity
      totalAmount += subtotal
      items.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      })
    }

    // Create sale + decrement stock + record mutations in transaction
    const sale = await this.prisma.$transaction(async tx => {
      const newSale = await tx.sale.create({
        data: {
          branchId: dto.branchId,
          studentId: dto.studentId || null,
          totalAmount,
          paymentMethod: dto.paymentMethod as any,
          createdById: currentUserId,
          saleItems: {
            create: items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.subtotal,
            })),
          },
        },
        include: {
          saleItems: { include: { product: true } },
          student: true,
          createdBy: true,
        },
      })

      // Decrement product stock + record mutations
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })

        await tx.stockMutation.create({
          data: {
            productId: item.productId,
            branchId: dto.branchId,
            type: 'OUT',
            quantity: item.quantity,
            notes: `Penjualan: ${newSale.id}`,
            createdById: currentUserId,
          },
        })
      }

      return newSale
    })

    return {
      success: true,
      data: this.formatSale(sale),
      message: 'Sale recorded successfully',
    }
  }

  async findAllSales(filters?: { branchId?: string; limit?: number }) {
    const sales = await this.prisma.sale.findMany({
      where: filters?.branchId ? { branchId: filters.branchId } : undefined,
      include: {
        saleItems: { include: { product: true } },
        student: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    })

    return {
      success: true,
      data: sales.map(s => this.formatSale(s)),
    }
  }

  // ============== STOCK MUTATIONS ==============
  async restock(dto: RestockDto, currentUserId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } })
    if (!product) throw new BadRequestException('Product not found')

    await this.prisma.$transaction(async tx => {
      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: { increment: dto.quantity } },
      })

      await tx.stockMutation.create({
        data: {
          productId: dto.productId,
          branchId: product.branchId,
          type: 'IN',
          quantity: dto.quantity,
          notes: dto.notes || 'Restock',
          createdById: currentUserId,
        },
      })
    })

    const updated = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { branch: true },
    })

    return {
      success: true,
      data: this.formatProduct(updated),
      message: `Restock berhasil: +${dto.quantity} ${product.name}`,
    }
  }

  async getLowStockProducts(branchId?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(branchId && { branchId }),
      },
      include: { branch: true },
    })

    const critical = products.filter(p => p.stock <= p.minStock).map(p => this.formatProduct(p))

    return {
      success: true,
      data: critical,
    }
  }

  // ============== STOCK TRANSFER (between branches) ==============
  /**
   * Transfer stock from one branch to another.
   * Creates TRANSFER_OUT mutation in source + TRANSFER_IN mutation in destination.
   * If destination doesn't have the product yet (same name + category), creates a new entry.
   */
  async transferStock(dto: TransferStockDto, currentUserId: string) {
    const sourceProduct = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { branch: true },
    })
    if (!sourceProduct) throw new NotFoundException('Product (source) not found')

    if (sourceProduct.branchId === dto.destinationBranchId) {
      throw new BadRequestException('Source and destination branch cannot be the same')
    }

    if (sourceProduct.stock < dto.quantity) {
      throw new BadRequestException(
        `Stok tidak cukup. Tersedia: ${sourceProduct.stock}, diminta: ${dto.quantity}`,
      )
    }

    const destBranch = await this.prisma.branch.findUnique({
      where: { id: dto.destinationBranchId },
    })
    if (!destBranch) throw new BadRequestException('Destination branch not found')

    // Find or create destination product (same name + category in dest branch)
    let destProduct = await this.prisma.product.findFirst({
      where: {
        branchId: dto.destinationBranchId,
        name: sourceProduct.name,
        category: sourceProduct.category,
      },
    })

    const result = await this.prisma.$transaction(async tx => {
      // Decrement source
      await tx.product.update({
        where: { id: sourceProduct.id },
        data: { stock: { decrement: dto.quantity } },
      })

      // Create or increment destination
      if (!destProduct) {
        destProduct = await tx.product.create({
          data: {
            branchId: dto.destinationBranchId,
            name: sourceProduct.name,
            category: sourceProduct.category,
            price: sourceProduct.price,
            stock: dto.quantity,
            minStock: sourceProduct.minStock,
            isActive: true,
          },
        })
      } else {
        destProduct = await tx.product.update({
          where: { id: destProduct.id },
          data: { stock: { increment: dto.quantity } },
        })
      }

      // Record TRANSFER_OUT in source
      const outMutation = await tx.stockMutation.create({
        data: {
          productId: sourceProduct.id,
          branchId: sourceProduct.branchId,
          type: 'TRANSFER_OUT',
          quantity: dto.quantity,
          notes:
            (dto.notes ? `${dto.notes} · ` : '') +
            `Transfer ke ${destBranch.name} (${destBranch.code})`,
          createdById: currentUserId,
        },
      })

      // Record TRANSFER_IN in destination
      await tx.stockMutation.create({
        data: {
          productId: destProduct.id,
          branchId: destProduct.branchId,
          type: 'TRANSFER_IN',
          quantity: dto.quantity,
          notes:
            (dto.notes ? `${dto.notes} · ` : '') +
            `Transfer dari ${sourceProduct.branch.name} (${sourceProduct.branch.code})`,
          createdById: currentUserId,
        },
      })

      return { outMutation, destProduct }
    })

    return {
      success: true,
      data: {
        sourceBranchName: sourceProduct.branch.name,
        destinationBranchName: destBranch.name,
        productName: sourceProduct.name,
        quantity: dto.quantity,
        destinationProductId: result.destProduct.id,
        mutationId: result.outMutation.id,
      },
      message: `Berhasil transfer ${dto.quantity} ${sourceProduct.name} dari ${sourceProduct.branch.name} ke ${destBranch.name}`,
    }
  }

  async getTransferHistory(branchId?: string) {
    const mutations = await this.prisma.stockMutation.findMany({
      where: {
        type: { in: ['TRANSFER_IN', 'TRANSFER_OUT'] },
        ...(branchId && { branchId }),
      },
      include: {
        product: { include: { branch: true } },
        branch: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return {
      success: true,
      data: mutations.map(m => ({
        id: m.id,
        productId: m.productId,
        productName: m.product.name,
        branchId: m.branchId,
        branchName: m.branch.name,
        type: m.type,
        quantity: m.quantity,
        notes: m.notes,
        createdByName: m.createdBy?.name,
        createdAt: m.createdAt.toISOString(),
      })),
    }
  }

  async getStockMutations(productId: string) {
    const mutations = await this.prisma.stockMutation.findMany({
      where: { productId },
      include: { createdBy: true, product: true },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      data: mutations.map(m => ({
        id: m.id,
        productId: m.productId,
        productName: m.product.name,
        type: m.type,
        quantity: m.quantity,
        notes: m.notes,
        createdByName: m.createdBy?.name,
        createdAt: m.createdAt.toISOString(),
      })),
    }
  }

  // ============== HELPERS ==============
  private formatProduct(p: any) {
    const stockStatus =
      p.stock === 0 ? 'OUT' : p.stock <= p.minStock ? 'LOW' : 'OK'

    return {
      id: p.id,
      branchId: p.branchId,
      branchName: p.branch?.name,
      name: p.name,
      category: p.category,
      price: p.price?.toString(),
      stock: p.stock,
      minStock: p.minStock,
      stockStatus,
      isActive: p.isActive,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
    }
  }

  private formatSale(s: any) {
    return {
      id: s.id,
      branchId: s.branchId,
      studentId: s.studentId,
      studentName: s.student?.name,
      totalAmount: s.totalAmount?.toString(),
      paymentMethod: s.paymentMethod,
      createdByName: s.createdBy?.name,
      createdAt: s.createdAt?.toISOString(),
      items: s.saleItems?.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product?.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice?.toString(),
        subtotal: i.subtotal?.toString(),
      })),
    }
  }
}
