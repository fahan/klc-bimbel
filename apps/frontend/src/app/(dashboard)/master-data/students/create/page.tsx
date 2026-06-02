'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { studentApi, branchApi, subjectApi } from '@/lib/api/endpoints'
import EnrollmentStepper from '@/components/enrollment/EnrollmentStepper'
import EnrollmentStep1 from '@/components/enrollment/EnrollmentStep1'
import EnrollmentStep1Display from '@/components/enrollment/EnrollmentStep1Display'
import EnrollmentStep2 from '@/components/enrollment/EnrollmentStep2'
import EnrollmentStep2Display from '@/components/enrollment/EnrollmentStep2Display'
import EnrollmentStep3 from '@/components/enrollment/EnrollmentStep3'
import EnrollmentStep4 from '@/components/enrollment/EnrollmentStep4'
import EnrollmentSummary from '@/components/enrollment/EnrollmentSummary'

interface StudentData {
  name: string
  sureName: string | null
  classLevel: string | null
  birthDate: string | null
  birthPlace: string | null
  parentName: string | null
  parentPhone: string | null
  address: string | null
  branchId: string
  enrolledAt: string | null
}

interface SelectedSubject {
  id: string
  name: string
  type: 'REGULAR' | 'PRIVATE'
  sppRateId: string
  sppAmount: number
}

interface SelectedSession {
  subjectId: string
  sessionId: string
}

export default function StudentEnrollmentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [studentData, setStudentData] = useState<Partial<StudentData>>({})
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([])
  const [selectedSessions, setSelectedSessions] = useState<SelectedSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get branches for subject selection context
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  // Get subjects for step 2
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectApi.getAll(),
  })

  // Get registration fee from selected branch, fallback to 200000
  const branches = branchesData?.data?.data || []
  const selectedBranch = branches.find((b: any) => b.id === studentData.branchId)
  const registrationFee = selectedBranch?.registrationFee ?? 200000

  // Calculate summary data
  const totalSppFirstMonth = selectedSubjects.reduce((sum, s) => sum + s.sppAmount, 0)
  const totalFirstBill = registrationFee + totalSppFirstMonth

  const handleStep1Complete = useCallback((data: Partial<StudentData>) => {
    setStudentData(data)
    setCurrentStep(2)
  }, [])

  const handleStep2Complete = useCallback((subjects: SelectedSubject[]) => {
    setSelectedSubjects(subjects)
    setCurrentStep(3)
  }, [])

  const handleStep3Complete = useCallback((sessions: SelectedSession[]) => {
    setSelectedSessions(sessions)
    setCurrentStep(4)
  }, [])

  const handleStep4Submit = useCallback(async () => {
    if (!studentData.branchId || !studentData.name) {
      setError('Missing student information')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create student first
      const studentResponse = await studentApi.create({
        name: studentData.name,
        sureName: studentData.sureName || null,
        classLevel: studentData.classLevel || null,
        birthDate: studentData.birthDate || null,
        birthPlace: studentData.birthPlace || null,
        parentName: studentData.parentName || null,
        parentPhone: studentData.parentPhone || null,
        address: studentData.address || null,
        branchId: studentData.branchId,
      })

      const newStudentId = studentResponse.data.data.id

      // Prepare enrollment data
      const enrollmentData = selectedSubjects.map(subject => {
        const session = selectedSessions.find(s => s.subjectId === subject.id)
        return {
          subjectId: subject.id,
          type: subject.type,
          sessionId: session?.sessionId,
        }
      })

      // Enroll student
      await studentApi.enroll(newStudentId, {
        subjects: enrollmentData,
        ...(studentData.enrolledAt ? { enrolledAt: studentData.enrolledAt } : {}),
      })

      // Invalidate students cache and redirect
      await queryClient.invalidateQueries({ queryKey: ['students'] })
      router.push(`/master-data/students?success=true&studentId=${newStudentId}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enroll student')
    } finally {
      setLoading(false)
    }
  }, [studentData, selectedSubjects, selectedSessions, router])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      router.back()
    }
  }, [currentStep, router])

  const handleNext = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep])

  const stepTitles = [
    'Data siswa',
    'Mata pelajaran',
    'Pilih jadwal',
    'Konfirmasi',
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">Pendaftaran Siswa Baru</h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <EnrollmentStepper currentStep={currentStep} steps={stepTitles} />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-6">
          {/* Left Column - Data Summary */}
          <div className="flex-1">
            {currentStep >= 1 && studentData.name && (
              <div className="mb-6">
                <EnrollmentStep1Display
                  data={studentData}
                  onEdit={() => setCurrentStep(1)}
                />
              </div>
            )}

            {currentStep >= 2 && selectedSubjects.length > 0 && (
              <div className="mb-6">
                <EnrollmentStep2Display
                  subjects={selectedSubjects}
                  onEdit={() => setCurrentStep(2)}
                />
              </div>
            )}
          </div>

          {/* Right Column - Active Step */}
          <div className="w-96">
            {currentStep === 1 && (
              <EnrollmentStep1
                initialData={studentData}
                onComplete={handleStep1Complete}
              />
            )}

            {currentStep === 2 && (
              <EnrollmentStep2 subjects={selectedSubjects} onComplete={handleStep2Complete} />
            )}

            {currentStep === 3 && (
              <EnrollmentStep3
                studentData={studentData}
                subjects={selectedSubjects}
                selectedSessions={selectedSessions}
                onComplete={handleStep3Complete}
              />
            )}

            {currentStep === 4 && (
              <EnrollmentStep4 onConfirm={handleStep4Submit} loading={loading} />
            )}

            {/* Summary Card */}
            <div className="mt-6">
              <EnrollmentSummary
                studentData={studentData}
                subjects={selectedSubjects}
                registrationFee={registrationFee}
                totalSppFirstMonth={totalSppFirstMonth}
                totalFirstBill={totalFirstBill}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Hidden as forms have their own submit buttons */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Langkah {currentStep} dari 4 · {stepTitles[currentStep - 1]}
          </span>
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
