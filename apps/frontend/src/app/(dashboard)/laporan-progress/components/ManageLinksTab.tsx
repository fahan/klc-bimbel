'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { progressReportApi, studentApi } from '@/lib/api/endpoints'
import {
  Plus,
  Search,
  MessageCircle,
  Copy,
  X,
  CheckCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { LoadingState, EmptyState } from '@/components/ui/States'
import { useApiBranchId } from '@/lib/branch-context'

const DURATION_PRESETS = [
  { value: 7, label: '7 hari' },
  { value: 30, label: '30 hari', isDefault: true },
  { value: 90, label: '3 bulan' },
  { value: 0, label: 'Permanen' },
]

function formatDate(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export interface LinkPrefill {
  studentId: string
  studentName: string
  studentSubjects: any[]
  subjectIds: string[]
}

export default function ManageLinksTab({
  prefill,
  onConsumePrefill,
}: {
  prefill?: LinkPrefill | null
  onConsumePrefill?: () => void
}) {
  const branchId = useApiBranchId()
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)

  // Form state
  const [formStudentId, setFormStudentId] = useState('')
  const [formStudentName, setFormStudentName] = useState('')
  const [formStudentSubjects, setFormStudentSubjects] = useState<any[]>([])
  const [formStudentSearch, setFormStudentSearch] = useState('')
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState('')
  const [formStudentDropdownOpen, setFormStudentDropdownOpen] = useState(false)
  const [formSubjectIds, setFormSubjectIds] = useState<string[]>([])
  const [formDuration, setFormDuration] = useState<number>(30)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // Apply prefill coming from the "View Progress" tab (Buat Link shortcut)
  useEffect(() => {
    if (!prefill) return
    setFormStudentId(prefill.studentId)
    setFormStudentName(prefill.studentName)
    setFormStudentSubjects(prefill.studentSubjects || [])
    setFormSubjectIds(prefill.subjectIds || [])
    setFormStudentSearch('')
    onConsumePrefill?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  // Debounce student search input (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedStudentSearch(formStudentSearch), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [formStudentSearch])

  const { data: linksData, isLoading, refetch } = useQuery({
    queryKey: ['progress-report-links', branchId, filterStatus],
    queryFn: () => progressReportApi.getAll({ branchId, status: filterStatus || undefined }),
  })

  const { data: metricsData } = useQuery({
    queryKey: ['progress-report-metrics', branchId],
    queryFn: () => progressReportApi.getMetrics(branchId),
  })

  const { data: studentsData, isFetching: studentsLoading } = useQuery({
    queryKey: ['students-search', branchId, debouncedStudentSearch],
    queryFn: () => studentApi.getAll(1, 20, branchId, debouncedStudentSearch || undefined),
    enabled: formStudentDropdownOpen,
  })

  const links = linksData?.data?.data || []
  const metrics = metricsData?.data?.data
  const students: any[] = studentsData?.data?.data || []

  const filteredLinks = useMemo(
    () =>
      links.filter(
        (l: any) =>
          !searchTerm || l.studentName?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [links, searchTerm],
  )

  const selectedLink = links.find((l: any) => l.id === selectedLinkId)

  const handleSubjectToggle = (subjectId: string) => {
    if (formSubjectIds.includes(subjectId)) {
      setFormSubjectIds(formSubjectIds.filter((s) => s !== subjectId))
    } else {
      setFormSubjectIds([...formSubjectIds, subjectId])
    }
  }

  const handleGenerate = async () => {
    if (!formStudentId || formSubjectIds.length === 0) {
      setError('Pilih siswa dan minimal satu mata pelajaran')
      return
    }
    try {
      setGenerating(true)
      setError('')
      await progressReportApi.create({
        studentId: formStudentId,
        subjectIds: formSubjectIds,
        durationDays: formDuration,
      })
      setFormStudentId('')
      setFormStudentName('')
      setFormStudentSubjects([])
      setFormSubjectIds([])
      refetch()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal generate link')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Cabut akses link ini? Orang tua tidak akan bisa membuka lagi.')) return
    try {
      await progressReportApi.revoke(id)
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal cabut link')
    }
  }

  const handleRenew = async (id: string) => {
    const days = prompt('Perpanjang berapa hari? (0 = permanen)', '30')
    if (days === null) return
    const n = parseInt(days, 10)
    if (isNaN(n) || n < 0) return alert('Input tidak valid')
    try {
      await progressReportApi.renew(id, n)
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal perpanjang link')
    }
  }

  const getPublicUrl = (token: string) => {
    if (typeof window === 'undefined') return `/laporan/${token}`
    return `${window.location.origin}/laporan/${token}`
  }

  const buildWAMessage = (link: any) => {
    const url = getPublicUrl(link.token)
    const expiryText = link.isPermanent
      ? 'Link permanen — tidak ada masa kedaluwarsa.'
      : `Link aktif hingga ${formatDate(link.expiresAt)}.`
    return `Assalamu'alaikum Bpk/Ibu orang tua ${link.studentName} 🙏

Berikut laporan progress belajar ${link.studentName} di
KLC Bimbel:

🔗 ${url}

${expiryText} Hubungi kami jika ada pertanyaan.`
  }

  const handleSendWA = (link: any) => {
    const url = `https://wa.me/?text=${encodeURIComponent(buildWAMessage(link))}`
    window.open(url, '_blank')
  }

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(getPublicUrl(token))
    alert('Link disalin!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          {[
            { v: '', l: 'Semua', c: 'bg-gray-100 text-gray-700' },
            { v: 'ACTIVE', l: 'Aktif', c: 'bg-green-100 text-green-700' },
            { v: 'EXPIRING_SOON', l: 'Segera kedaluwarsa', c: 'bg-amber-100 text-amber-700' },
            { v: 'EXPIRED', l: 'Kedaluwarsa', c: 'bg-red-100 text-red-700' },
            { v: 'PERMANENT', l: 'Permanen', c: 'bg-blue-100 text-blue-700' },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setFilterStatus(s.v)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterStatus === s.v
                  ? s.c + ' ring-2 ring-offset-1 ring-gray-300'
                  : s.c + ' opacity-70 hover:opacity-100'
              }`}
            >
              {s.l}
            </button>
          ))}
          <div className="flex-1 ml-auto max-w-md relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-600 font-medium">Total Link Dibuat</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total}</p>
            </div>
            <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
              <p className="text-xs text-green-600 font-medium">Link Aktif</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{metrics.active}</p>
            </div>
            <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm">
              <p className="text-xs text-amber-600 font-medium">Segera Kedaluwarsa</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{metrics.expiringSoon}</p>
              <p className="text-[11px] text-amber-500 mt-1">≤ 7 hari</p>
            </div>
            <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
              <p className="text-xs text-red-600 font-medium">Sudah Kedaluwarsa</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{metrics.expired}</p>
            </div>
          </div>
        )}

        {/* Links Table */}
        {isLoading ? (
          <LoadingState />
        ) : links.length === 0 ? (
          <EmptyState
            title="Belum ada link laporan"
            description="Generate link baru di panel kanan untuk memulai"
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                      Siswa & Mapel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Dibuat</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                      Berlaku Hingga
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLinks.map((link: any) => {
                    const isSelected = selectedLinkId === link.id
                    const isExpired = link.status === 'EXPIRED'
                    return (
                      <tr
                        key={link.id}
                        onClick={() => setSelectedLinkId(link.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        } ${isExpired ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{link.studentName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {link.subjectIds?.length || 0} mapel · {link.viewCount} kali dibuka
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {formatDate(link.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {link.isPermanent ? (
                            <span className="text-blue-700 font-medium">Permanen</span>
                          ) : link.status === 'EXPIRING_SOON' ? (
                            <span className="text-amber-700 font-medium">
                              {formatDate(link.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-gray-700">{formatDate(link.expiresAt)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {link.status === 'PERMANENT' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Permanen
                            </span>
                          ) : link.status === 'EXPIRED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Kedaluwarsa
                            </span>
                          ) : link.status === 'EXPIRING_SOON' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              {link.daysLeft} hari lagi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3" /> Aktif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {!isExpired && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSendWA(link)
                                  }}
                                  className="p-1.5 hover:bg-green-50 text-green-700 rounded transition"
                                  title="Kirim via WA"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyLink(link.token)
                                  }}
                                  className="p-1.5 hover:bg-gray-100 text-gray-700 rounded transition"
                                  title="Salin link"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {isExpired || link.status === 'EXPIRING_SOON' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRenew(link.id)
                                }}
                                className="p-1.5 hover:bg-blue-50 text-blue-700 rounded transition"
                                title="Perbarui"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            ) : null}
                            {!isExpired && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRevoke(link.id)
                                }}
                                className="p-1.5 hover:bg-red-50 text-red-700 rounded transition"
                                title="Cabut"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Generate Form */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Generate Link Baru
          </h2>

          {/* Student */}
          <div className="mb-4 relative">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Pilih Siswa <span className="text-red-500">*</span>
            </label>
            {formStudentId ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-blue-300 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900 flex-1">{formStudentName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormStudentId('')
                    setFormStudentName('')
                    setFormStudentSubjects([])
                    setFormStudentSearch('')
                    setFormSubjectIds([])
                  }}
                  className="text-blue-400 hover:text-blue-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama siswa..."
                  value={formStudentSearch}
                  onChange={(e) => {
                    setFormStudentSearch(e.target.value)
                    setFormStudentDropdownOpen(true)
                  }}
                  onFocus={() => setFormStudentDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setFormStudentDropdownOpen(false), 150)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formStudentDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {studentsLoading ? (
                      <p className="text-xs text-gray-400 px-3 py-2 italic">Mencari...</p>
                    ) : students.length === 0 ? (
                      <p className="text-xs text-gray-500 px-3 py-2 italic">
                        {debouncedStudentSearch ? 'Siswa tidak ditemukan' : 'Ketik untuk mencari siswa'}
                      </p>
                    ) : (
                      students.map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => {
                            setFormStudentId(s.id)
                            setFormStudentName(s.name)
                            setFormStudentSubjects(s.subjects || [])
                            setFormStudentSearch('')
                            setFormSubjectIds([])
                            setFormStudentDropdownOpen(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 transition"
                        >
                          {s.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subjects checklist */}
          {formStudentId && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Mata Pelajaran yang Ditampilkan <span className="text-red-500">*</span>
              </label>
              {formStudentSubjects.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded">
                  Siswa belum terdaftar di mapel manapun
                </p>
              ) : (
                <div className="space-y-1.5">
                  {formStudentSubjects.map((s: any) => {
                    const isChecked = formSubjectIds.includes(s.subjectId)
                    return (
                      <label
                        key={s.subjectId}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSubjectToggle(s.subjectId)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-900 flex-1">
                          {s.subjectName}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            s.type === 'REGULAR'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {s.type === 'REGULAR' ? 'Reguler' : 'Privat'}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Duration */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">Durasi Link Aktif</label>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setFormDuration(d.value)}
                  className={`py-2 rounded-lg text-sm font-medium transition border-2 ${
                    formDuration === d.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview URL */}
          {formStudentId && (
            <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-[10px] uppercase text-gray-500 font-semibold mb-1">Preview URL</p>
              <p className="text-[11px] font-mono text-gray-700 break-all">
                /laporan/[token-akan-digenerate]
              </p>
            </div>
          )}

          {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">{error}</div>}

          <button
            onClick={handleGenerate}
            disabled={!formStudentId || formSubjectIds.length === 0 || generating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {generating ? 'Generating...' : 'Generate & Lanjut Kirim'}
          </button>
        </div>

        {/* WhatsApp Preview */}
        {selectedLink && selectedLink.status !== 'EXPIRED' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-green-50 border-b border-green-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-green-900 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Preview Pesan WhatsApp
              </h3>
            </div>
            <div className="p-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded font-sans border border-gray-200">
                {buildWAMessage(selectedLink)}
              </pre>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => handleSendWA(selectedLink)}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Buka WA
                </button>
                <button
                  onClick={() => handleCopyLink(selectedLink.token)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Salin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
