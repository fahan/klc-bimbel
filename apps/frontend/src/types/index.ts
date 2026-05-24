// Auth
export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'OWNER' | 'ADMIN_GLOBAL' | 'ADMIN_CABANG' | 'GURU'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: User
    token: string
  }
  message?: string
}

// Branch
export interface Branch {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Subject
export interface Subject {
  id: string
  name: string
  code: string
  trackingType: 'MODULE_BASED' | 'FREE_MATERIAL'
  maxCapacityRegular: number
  maxCapacityPrivate: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Student
export interface Student {
  id: string
  branchId: string
  name: string
  classLevel?: string
  parentName?: string
  parentPhone?: string
  registeredAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// API Response
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}
