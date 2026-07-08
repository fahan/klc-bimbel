'use client'

import { useQuery } from '@tanstack/react-query'
import { attendanceApi, invoiceApi, storeApi, landingApi } from '@/lib/api/endpoints'

export type NotificationItem = {
  id: string
  type: 'adhoc' | 'invoice' | 'stock' | 'registration'
  title: string
  description: string
  href: string
  severity: 'info' | 'warning' | 'danger'
}

export function useNotifications(branchId?: string) {
  const month = new Date().getMonth() + 1
  const year = new Date().getFullYear()

  const { data: adHocData } = useQuery({
    queryKey: ['notifications-adhoc', branchId],
    queryFn: () => attendanceApi.getAdHocPending({ branchId }),
    staleTime: 60_000,
  })

  // Same queryKey as dashboard/page.tsx so React Query deduplicates the request
  const { data: invoiceData } = useQuery({
    queryKey: ['invoice-metrics', month, year, branchId],
    queryFn: () => invoiceApi.getMetrics({ branchId, month, year }),
    staleTime: 60_000,
  })

  const { data: lowStockData } = useQuery({
    queryKey: ['notifications-lowstock', branchId],
    queryFn: () => storeApi.getLowStock(branchId),
    staleTime: 120_000,
  })

  const { data: registrationData } = useQuery({
    queryKey: ['notifications-registrations'],
    queryFn: () => landingApi.getRegistrations({ status: 'NEW', limit: 100 }),
    staleTime: 60_000,
  })

  const notifications: NotificationItem[] = []

  const adHocList: any[] = adHocData?.data?.data ?? []
  if (adHocList.length > 0) {
    notifications.push({
      id: 'adhoc',
      type: 'adhoc',
      title: 'Sesi Darurat Menunggu',
      description: `${adHocList.length} sesi ad-hoc belum disetujui admin`,
      href: '/presensi',
      severity: 'warning',
    })
  }

  const invoiceMetrics = invoiceData?.data?.data
  if (invoiceMetrics && invoiceMetrics.unpaidCount > 0) {
    notifications.push({
      id: 'invoice',
      type: 'invoice',
      title: 'Invoice Belum Dibayar',
      description: `${invoiceMetrics.unpaidCount} invoice belum terbayar bulan ini`,
      href: '/invoice-tagihan',
      severity: invoiceMetrics.unpaidCount >= 5 ? 'danger' : 'warning',
    })
  }

  const lowStockList: any[] = lowStockData?.data?.data ?? []
  if (lowStockList.length > 0) {
    notifications.push({
      id: 'stock',
      type: 'stock',
      title: 'Stok Hampir Habis',
      description: `${lowStockList.length} produk perlu segera direstok`,
      href: '/toko-stok',
      severity: 'warning',
    })
  }

  const pendingRegs: any[] = registrationData?.data?.data ?? []
  if (pendingRegs.length > 0) {
    notifications.push({
      id: 'registration',
      type: 'registration',
      title: 'Pendaftar Baru',
      description: `${pendingRegs.length} calon siswa baru dari landing page`,
      href: '/landing-content',
      severity: 'info',
    })
  }

  return { notifications, unreadCount: notifications.length }
}
