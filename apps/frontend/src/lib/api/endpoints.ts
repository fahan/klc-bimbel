import apiClient from './client'

// ===== BRANCHES API =====
export const branchApi = {
  getAll: (page?: number, limit?: number) => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    const qs = params.toString()
    return apiClient.get(`/branches${qs ? `?${qs}` : ''}`)
  },
  getAllSystem: () => apiClient.get('/branches/all-system'),
  getOne: (id: string) => apiClient.get(`/branches/${id}`),
  create: (data: any) => apiClient.post('/branches', data),
  update: (id: string, data: any) => apiClient.put(`/branches/${id}`, data),
  delete: (id: string) => apiClient.delete(`/branches/${id}`),
}

// ===== SUBJECTS API =====
export const subjectApi = {
  getAll: (page?: number, limit?: number, trackingType?: string) => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    if (trackingType) params.append('trackingType', trackingType)
    const qs = params.toString()
    return apiClient.get(`/subjects${qs ? `?${qs}` : ''}`)
  },
  getOne: (id: string) => apiClient.get(`/subjects/${id}`),
  create: (data: any) => apiClient.post('/subjects', data),
  update: (id: string, data: any) => apiClient.put(`/subjects/${id}`, data),
  delete: (id: string) => apiClient.delete(`/subjects/${id}`),
}

// ===== SPP RATES API =====
export const sppRateApi = {
  getAll: (page?: number, limit?: number, subjectId?: string) => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    if (subjectId) params.append('subjectId', subjectId)
    const qs = params.toString()
    return apiClient.get(`/spp-rates${qs ? `?${qs}` : ''}`)
  },
  getOne: (id: string) => apiClient.get(`/spp-rates/${id}`),
  getBySubject: (subjectId: string) => apiClient.get(`/spp-rates/by-subject/${subjectId}`),
  getActiveRate: (subjectId: string, type: string) =>
    apiClient.get(`/spp-rates/active/${subjectId}/${type}`),
  create: (data: any) => apiClient.post('/spp-rates', data),
  update: (id: string, data: any) => apiClient.put(`/spp-rates/${id}`, data),
  delete: (id: string) => apiClient.delete(`/spp-rates/${id}`),
}

// ===== CURRICULUM MODULES API =====
export const curriculumModuleApi = {
  getAll: (page?: number, limit?: number, subjectId?: string) => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    if (subjectId) params.append('subjectId', subjectId)
    const qs = params.toString()
    return apiClient.get(`/curriculum-modules${qs ? `?${qs}` : ''}`)
  },
  getOne: (id: string) => apiClient.get(`/curriculum-modules/${id}`),
  getBySubject: (subjectId: string) => apiClient.get(`/curriculum-modules/by-subject/${subjectId}`),
  create: (data: any) => apiClient.post('/curriculum-modules', data),
  update: (id: string, data: any) => apiClient.put(`/curriculum-modules/${id}`, data),
  reorder: (modules: Array<{ id: string; orderNumber: number }>) =>
    apiClient.post('/curriculum-modules/reorder', modules),
  delete: (id: string) => apiClient.delete(`/curriculum-modules/${id}`),
}

// ===== TEACHERS API =====
export const teacherApi = {
  getAll: (page?: number, limit?: number, branchId?: string) => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    if (branchId) params.append('branchId', branchId)
    const qs = params.toString()
    return apiClient.get(`/teachers${qs ? `?${qs}` : ''}`)
  },
  getOne: (id: string) => apiClient.get(`/teachers/${id}`),
  create: (data: any) => apiClient.post('/teachers', data),
  update: (id: string, data: any) => apiClient.put(`/teachers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/teachers/${id}`),
}

// ===== SESSIONS API =====
export const sessionApi = {
  getAll: (page?: number, limit?: number, filters?: { branchId?: string; teacherId?: string; subjectId?: string; dayOfWeek?: string }) => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.teacherId) params.append('teacherId', filters.teacherId)
    if (filters?.subjectId) params.append('subjectId', filters.subjectId)
    if (filters?.dayOfWeek) params.append('dayOfWeek', filters.dayOfWeek)
    const queryString = params.toString()
    return apiClient.get(`/sessions${queryString ? `?${queryString}` : ''}`)
  },
  getOne: (id: string) => apiClient.get(`/sessions/${id}`),
  getTodayForMe: () => apiClient.get('/sessions/today/me'),
  getAvailableForSubstitution: (filters?: { branchId?: string; searchType?: 'guru' | 'siswa'; searchQuery?: string }) => {
    const params = new URLSearchParams()
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.searchType) params.append('searchType', filters.searchType)
    if (filters?.searchQuery) params.append('searchQuery', filters.searchQuery)
    const qs = params.toString()
    return apiClient.get(`/sessions/available-for-substitution${qs ? `?${qs}` : ''}`)
  },
  create: (data: any) => apiClient.post('/sessions', data),
  createBulk: (data: any) => apiClient.post('/sessions/create-bulk', data),
  createCombined: (data: any) => apiClient.post('/sessions/create-combined', data),
  update: (id: string, data: any) => apiClient.put(`/sessions/${id}`, data),
  updateWithStudents: (id: string, data: any) => apiClient.put(`/sessions/${id}/with-students`, data),
  delete: (id: string) => apiClient.delete(`/sessions/${id}`), // Soft delete (archive)
  hardDelete: (id: string) => apiClient.delete(`/sessions/${id}/hard-delete`), // Permanent delete
}

// ===== ATTENDANCE API =====
export const attendanceApi = {
  submit: (data: any) => apiClient.post('/attendance/submit', data),
  getSessionLog: (sessionId: string, date: string) =>
    apiClient.get(`/attendance/session/${sessionId}?date=${date}`),
  getHistory: (sessionId: string) => apiClient.get(`/attendance/history/${sessionId}`),
  getReport: (filters?: {
    dateFrom?: string
    dateTo?: string
    branchId?: string
    teacherId?: string
    page?: number
    limit?: number
  }) => {
    const params = new URLSearchParams()
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.append('dateTo', filters.dateTo)
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.teacherId) params.append('teacherId', filters.teacherId)
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.limit) params.append('limit', String(filters.limit))
    const qs = params.toString()
    return apiClient.get(`/attendance/report${qs ? `?${qs}` : ''}`)
  },
}

// ===== PROGRESS API =====
export const progressApi = {
  submit: (data: any) => apiClient.post('/progress/submit', data),
  getStudentProgress: (studentId: string, subjectId?: string) => {
    const params = subjectId ? `?subjectId=${subjectId}` : ''
    return apiClient.get(`/progress/student/${studentId}${params}`)
  },
  getStudentLastModule: (studentId: string, subjectId: string) =>
    apiClient.get(`/progress/student/${studentId}/last-module/${subjectId}`),
}

// ===== INVOICES API =====
export const invoiceApi = {
  // Public endpoint (no auth) - using bare axios to avoid auth header issues
  getByToken: (token: string) => apiClient.get(`/invoices/public/${token}`),

  getAll: (filters?: {
    branchId?: string
    status?: string
    type?: string
    month?: number
    year?: number
    studentId?: string
  }) => {
    const params = new URLSearchParams()
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.month) params.append('month', String(filters.month))
    if (filters?.year) params.append('year', String(filters.year))
    if (filters?.studentId) params.append('studentId', filters.studentId)
    const qs = params.toString()
    return apiClient.get(`/invoices${qs ? `?${qs}` : ''}`)
  },
  getOne: (id: string) => apiClient.get(`/invoices/${id}`),
  getMetrics: (filters?: { branchId?: string; month?: number; year?: number }) => {
    const params = new URLSearchParams()
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.month) params.append('month', String(filters.month))
    if (filters?.year) params.append('year', String(filters.year))
    const qs = params.toString()
    return apiClient.get(`/invoices/metrics${qs ? `?${qs}` : ''}`)
  },
  create: (data: any) => apiClient.post('/invoices', data),
  delete: (id: string) => apiClient.delete(`/invoices/${id}`),
}

// ===== PAYMENTS API =====
export const paymentApi = {
  record: (data: any) => apiClient.post('/payments/record', data),
  getInvoicePayments: (invoiceId: string) => apiClient.get(`/payments/invoice/${invoiceId}`),
  getRecent: (branchId?: string, limit?: number) => {
    const params = new URLSearchParams()
    if (branchId) params.append('branchId', branchId)
    if (limit) params.append('limit', String(limit))
    const qs = params.toString()
    return apiClient.get(`/payments/recent${qs ? `?${qs}` : ''}`)
  },
  delete: (id: string) => apiClient.delete(`/payments/${id}`),
}

// ===== COMMISSIONS API =====
export const commissionApi = {
  calculate: (data: { branchId: string; month: number; year: number }) =>
    apiClient.post('/commissions/calculate', data),
  getByMonth: (branchId: string, month: number, year: number) =>
    apiClient.get(`/commissions?branchId=${branchId}&month=${month}&year=${year}`),
  getMy: (year?: number) => {
    const params = year ? `?year=${year}` : ''
    return apiClient.get(`/commissions/my${params}`)
  },
  getDetail: (id: string) => apiClient.get(`/commissions/${id}`),
  approve: (id: string) => apiClient.post(`/commissions/${id}/approve`, {}),
  approveAll: (data: { branchId: string; month: number; year: number }) =>
    apiClient.post('/commissions/approve-all', data),
}

// ===== PROGRESS REPORTS API =====
export const progressReportApi = {
  // Public — no auth required
  getByToken: (token: string) => apiClient.get(`/progress-reports/public/${token}`),

  getAll: (filters?: { branchId?: string; status?: string; studentId?: string }) => {
    const params = new URLSearchParams()
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.studentId) params.append('studentId', filters.studentId)
    const qs = params.toString()
    return apiClient.get(`/progress-reports${qs ? `?${qs}` : ''}`)
  },
  getMetrics: (branchId?: string) => {
    const qs = branchId ? `?branchId=${branchId}` : ''
    return apiClient.get(`/progress-reports/metrics${qs}`)
  },
  create: (data: any) => apiClient.post('/progress-reports', data),
  revoke: (id: string) => apiClient.post(`/progress-reports/${id}/revoke`, {}),
  renew: (id: string, durationDays: number) =>
    apiClient.post(`/progress-reports/${id}/renew`, { durationDays }),
}

// ===== FINANCE API =====
export const financeApi = {
  getOverview: (month: number, year: number, branchId?: string) => {
    const params = new URLSearchParams()
    params.append('month', String(month))
    params.append('year', String(year))
    if (branchId) params.append('branchId', branchId)
    return apiClient.get(`/finance/overview?${params.toString()}`)
  },
  getTransactions: (branchId?: string, limit?: number) => {
    const params = new URLSearchParams()
    if (branchId) params.append('branchId', branchId)
    if (limit) params.append('limit', String(limit))
    const qs = params.toString()
    return apiClient.get(`/finance/transactions${qs ? `?${qs}` : ''}`)
  },
}

// ===== STORE API =====
export const storeApi = {
  // Products
  getProducts: (filters?: { branchId?: string; category?: string; lowStock?: boolean }) => {
    const params = new URLSearchParams()
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.category) params.append('category', filters.category)
    if (filters?.lowStock) params.append('lowStock', 'true')
    const qs = params.toString()
    return apiClient.get(`/store/products${qs ? `?${qs}` : ''}`)
  },
  getProductMetrics: (branchId?: string) => {
    const qs = branchId ? `?branchId=${branchId}` : ''
    return apiClient.get(`/store/products/metrics${qs}`)
  },
  getLowStock: (branchId?: string) => {
    const qs = branchId ? `?branchId=${branchId}` : ''
    return apiClient.get(`/store/products/low-stock${qs}`)
  },
  getProduct: (id: string) => apiClient.get(`/store/products/${id}`),
  createProduct: (data: any) => apiClient.post('/store/products', data),
  updateProduct: (id: string, data: any) => apiClient.put(`/store/products/${id}`, data),
  getProductMutations: (id: string) => apiClient.get(`/store/products/${id}/mutations`),
  // Sales
  createSale: (data: any) => apiClient.post('/store/sales', data),
  getSales: (filters?: { branchId?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.limit) params.append('limit', String(filters.limit))
    const qs = params.toString()
    return apiClient.get(`/store/sales${qs ? `?${qs}` : ''}`)
  },
  // Restock
  restock: (data: any) => apiClient.post('/store/restock', data),
  // Transfer between branches
  transferStock: (data: any) => apiClient.post('/store/transfer', data),
  getTransferHistory: (branchId?: string) => {
    const qs = branchId ? `?branchId=${branchId}` : ''
    return apiClient.get(`/store/transfer/history${qs}`)
  },
}

// ===== STUDENTS API =====
export const studentApi = {
  getAll: (page?: number, limit?: number, branchId?: string, search?: string) => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    if (branchId) params.append('branchId', branchId)
    if (search) params.append('search', search)
    const qs = params.toString()
    return apiClient.get(`/students${qs ? `?${qs}` : ''}`)
  },
  getOne: (id: string) => apiClient.get(`/students/${id}`),
  create: (data: any) => apiClient.post('/students', data),
  update: (id: string, data: any) => apiClient.put(`/students/${id}`, data),
  delete: (id: string) => apiClient.delete(`/students/${id}`),
  import: (formData: FormData) => apiClient.post('/students/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  enroll: (id: string, data: any) => apiClient.post(`/students/${id}/enroll`, data),
  getAvailableSessions: (subjectId: string, branchId: string, type: 'REGULAR' | 'PRIVATE') =>
    apiClient.get(`/students/enrollment/sessions/${subjectId}`, { params: { branchId, type } }),
  addSubject: (studentId: string, data: { subjectId: string; type: string }) =>
    apiClient.post(`/students/${studentId}/add-subject`, data),
  updateSubject: (studentId: string, subjectId: string, data: any) =>
    apiClient.put(`/students/${studentId}/subjects/${subjectId}`, data),
  removeSubject: (studentId: string, subjectId: string) =>
    apiClient.delete(`/students/${studentId}/subjects/${subjectId}`),
}

// ===== USERS API =====
export const usersApi = {
  getAll: (page?: number, limit?: number, filters?: { branchId?: string; search?: string; role?: string }) => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.role) params.append('role', filters.role)
    const qs = params.toString()
    return apiClient.get(`/users${qs ? `?${qs}` : ''}`)
  },
  getOne: (id: string) => apiClient.get(`/users/${id}`),
  getMe: () => apiClient.get('/auth/me'),
  updateRole: (id: string, role: string) => apiClient.put(`/users/${id}/role`, { role }),
  addRole: (id: string, role: string) => apiClient.put(`/users/${id}/roles/${role}/add`, {}),
  removeRole: (id: string, role: string) => apiClient.put(`/users/${id}/roles/${role}/remove`, {}),
  assignBranch: (id: string, data: { branchId: string; isPrimary?: boolean }) =>
    apiClient.put(`/users/${id}/branch`, data),
  removeBranch: (id: string, branchId: string) => apiClient.delete(`/users/${id}/branch/${branchId}`),
  deactivate: (id: string) => apiClient.put(`/users/${id}/deactivate`, {}),
  activate: (id: string) => apiClient.put(`/users/${id}/activate`, {}),
}
