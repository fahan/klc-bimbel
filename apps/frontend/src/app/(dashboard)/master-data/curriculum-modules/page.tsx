'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { curriculumModuleApi, subjectApi } from '@/lib/api/endpoints'
import { BookOpen, ChevronRight, ArrowLeft, Layers, Hash } from 'lucide-react'

interface CurriculumModule {
  id: string
  subjectId: string
  orderNumber: number
  name: string
  totalChapters: number
}

interface Subject {
  id: string
  name: string
  trackingType: string
  description?: string
}

export default function CurriculumModulesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [modules, setModules] = useState<CurriculumModule[]>([])
  const [moduleCounts, setModuleCounts] = useState<Map<string, number>>(new Map())
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true)
  const [isLoadingModules, setIsLoadingModules] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    setIsLoadingSubjects(true)
    try {
      const res = await subjectApi.getAll(undefined, undefined, 'MODULE_BASED')
      const subjectList: Subject[] = res.data.data || []
      setSubjects(subjectList)

      // Fetch module count for each subject
      const counts = new Map<string, number>()
      await Promise.all(
        subjectList.map(async (s) => {
          try {
            const modRes = await curriculumModuleApi.getAll(undefined, undefined, s.id)
            const mods = modRes.data.data || modRes.data.items || []
            counts.set(s.id, Array.isArray(mods) ? mods.length : 0)
          } catch {
            counts.set(s.id, 0)
          }
        })
      )
      setModuleCounts(counts)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data mata pelajaran')
    } finally {
      setIsLoadingSubjects(false)
    }
  }

  const fetchModules = async (subject: Subject) => {
    setSelectedSubject(subject)
    setIsLoadingModules(true)
    setError('')
    try {
      const res = await curriculumModuleApi.getAll(undefined, undefined, subject.id)
      const raw = res.data.data || res.data.items || []
      const sorted = [...raw].sort((a: CurriculumModule, b: CurriculumModule) => a.orderNumber - b.orderNumber)
      setModules(sorted)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat modul kurikulum')
    } finally {
      setIsLoadingModules(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus modul ini?')) return
    try {
      await curriculumModuleApi.delete(id)
      if (selectedSubject) fetchModules(selectedSubject)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus modul')
    }
  }

  const handleBack = () => {
    setSelectedSubject(null)
    setModules([])
    setError('')
    fetchSubjects()
  }

  // ── Module detail view ──────────────────────────────────────────
  if (selectedSubject) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <div className="w-px h-5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{selectedSubject.name}</h1>
                <p className="text-xs text-gray-500">Modul Kurikulum</p>
              </div>
            </div>
          </div>
          <Link
            href={`/master-data/curriculum-modules/create?subjectId=${selectedSubject.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-1.5"
          >
            + Tambah Modul
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Modules Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoadingModules ? (
            <div className="p-12 text-center text-gray-500 text-sm">Memuat modul...</div>
          ) : modules.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-3">Belum ada modul untuk mata pelajaran ini</p>
              <Link
                href={`/master-data/curriculum-modules/create?subjectId=${selectedSubject.id}`}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Tambah modul pertama
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">No</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama Modul</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Bab</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                        {mod.orderNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{mod.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        <Hash className="w-3 h-3" />
                        {mod.totalChapters} bab
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/master-data/curriculum-modules/${mod.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(mod.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {modules.length > 0 && (
          <p className="text-xs text-gray-400 text-right">{modules.length} modul</p>
        )}
      </div>
    )
  }

  // ── Subject card list view ──────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurikulum Modul</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pilih mata pelajaran untuk melihat modul</p>
        </div>
        <Link
          href="/master-data/curriculum-modules/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-1.5"
        >
          + Tambah Modul
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoadingSubjects && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1.5" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Subject cards */}
      {!isLoadingSubjects && subjects.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Belum ada mata pelajaran bertipe MODULE_BASED</p>
        </div>
      )}

      {!isLoadingSubjects && subjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const count = moduleCounts.get(subject.id) ?? '...'
            return (
              <button
                key={subject.id}
                onClick={() => fetchModules(subject)}
                className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left p-5 w-full"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-0.5" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-blue-700 transition-colors">
                  {subject.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                    <Layers className="w-3 h-3" />
                    {count} modul
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
