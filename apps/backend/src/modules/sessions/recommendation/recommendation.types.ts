export type EngineDayOfWeek =
  | 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU'

export type EngineSessionType = 'REGULAR' | 'PRIVATE'

export interface TimeRange {
  start: string // HH:mm
  end: string   // HH:mm
}

export interface CandidateSlot {
  dayOfWeek: EngineDayOfWeek
  startMinutes: number
}

export interface DemandItem {
  studentId: string
  studentName: string
  classLevel: string | null
  subjectId: string
  subjectName: string
  type: EngineSessionType
  maxCapacityRegular: number
  maxCapacityPrivate: number
}

export interface TeacherInfo {
  teacherId: string
  name: string
}

export interface BusySlot {
  teacherId: string
  dayOfWeek: EngineDayOfWeek
  startMinutes: number
  endMinutes: number
}

export interface StudentBusySlot {
  studentId: string
  dayOfWeek: EngineDayOfWeek
  startMinutes: number
  endMinutes: number
}

export interface ProposalItem {
  tempId: string
  subjectId: string
  subjectName: string
  type: EngineSessionType
  teacherId: string
  teacherName: string
  dayOfWeek: EngineDayOfWeek
  startTime: string // HH:mm
  durationMinutes: number
  studentIds: string[]
  studentNames: string[]
}

export interface UnassignedItem {
  subjectId: string
  subjectName: string
  type: EngineSessionType
  studentIds: string[]
  studentNames: string[]
  reason: string
}

export interface TeacherLoadItem {
  teacherId: string
  name: string
  sessionCount: number
}

export interface EngineInput {
  durationMinutes: number
  activeDays: EngineDayOfWeek[]
  timeWindow: TimeRange
  breakWindow?: TimeRange | null
  demand: DemandItem[]
  teachers: TeacherInfo[]
  busySlots: BusySlot[]
  sessionsPerWeek?: number
  studentBusySlots?: StudentBusySlot[]
}

export interface EngineOutput {
  proposals: ProposalItem[]
  unassigned: UnassignedItem[]
  teacherLoad: TeacherLoadItem[]
}

// ----- Apply planning -----

export interface ApplyProposal {
  tempId: string
  subjectId: string
  type: EngineSessionType
  teacherId: string
  dayOfWeek: EngineDayOfWeek
  startTime: string // HH:mm
  durationMinutes: number
  studentIds: string[]
}

export interface ApplyPlanInput {
  proposals: ApplyProposal[]
  activeTeacherIds: string[]
  activeStudentIds: string[]
  subjectCapacity: Record<string, { maxCapacityRegular: number; maxCapacityPrivate: number }>
  busySlots: BusySlot[]
  studentBusySlots?: StudentBusySlot[]
}

export interface ApplyPlan {
  toCreate: ApplyProposal[]
  skipped: { tempId: string; reason: string }[]
}
