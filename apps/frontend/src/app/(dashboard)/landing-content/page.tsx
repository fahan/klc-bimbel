'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { landingApi } from '@/lib/api/endpoints'
import { useRouter } from 'next/navigation'
import { Globe, Save, Plus, Trash2, RefreshCw, ExternalLink, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'
import ImageUpload from '@/components/ui/ImageUpload'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroContent {
  eyebrowText: string
  headline: string
  subheadline: string
  photoUrl?: string
  stats: { num: string; label: string }[]
}

interface Teacher {
  name: string
  role: string
  badge: string
  photoUrl: string
}

interface Testimonial {
  quote: string
  authorName: string
  authorMeta: string
  initials: string
}

interface FaqItem {
  question: string
  answer: string
}

interface GalleryItem {
  caption: string
}

interface ContactContent {
  phone: string
  whatsapp: string
  email: string
  instagram: string
  waMessage: string
}

const TABS = [
  { key: 'hero', label: 'Hero' },
  { key: 'teachers', label: 'Tim Guru' },
  { key: 'testimonials', label: 'Testimoni' },
  { key: 'faq', label: 'FAQ' },
  { key: 'gallery', label: 'Galeri' },
  { key: 'contact', label: 'Kontak' },
  { key: 'registrations', label: 'Pendaftar' },
]

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition"
    >
      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {saving ? 'Menyimpan...' : 'Simpan'}
    </button>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  )
}

function Textarea({ value, onChange, rows = 3, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
    />
  )
}

// ─── Hero Tab ─────────────────────────────────────────────────────────────────

function HeroTab({ initial }: { initial: HeroContent }) {
  const qc = useQueryClient()
  const [data, setData] = useState<HeroContent>(initial)

  useEffect(() => { setData(initial) }, [initial])

  const { mutate, isPending } = useMutation({
    mutationFn: () => landingApi.upsertContentSection('hero', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-content'] }),
  })

  const updateStat = (i: number, field: 'num' | 'label', val: string) => {
    const stats = [...data.stats]
    stats[i] = { ...stats[i], [field]: val }
    setData(d => ({ ...d, stats }))
  }

  const addStat = () => setData(d => ({ ...d, stats: [...d.stats, { num: '', label: '' }] }))
  const removeStat = (i: number) => setData(d => ({ ...d, stats: d.stats.filter((_, idx) => idx !== i) }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Section Hero</h2>
        <SaveButton saving={isPending} onClick={() => mutate()} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <FieldGroup label="Teks Eyebrow (kecil di atas judul)">
          <Input value={data.eyebrowText} onChange={v => setData(d => ({ ...d, eyebrowText: v }))} placeholder="Pendaftaran Tahun Ajaran..." />
        </FieldGroup>
        <FieldGroup label="Headline Utama">
          <Textarea value={data.headline} onChange={v => setData(d => ({ ...d, headline: v }))} rows={2} placeholder="Anak belajar <em>tuntas</em>..." />
          <p className="text-xs text-gray-500 mt-1">Gunakan <code className="bg-gray-100 px-1 rounded">&lt;em&gt;kata&lt;/em&gt;</code> untuk teks italic orange</p>
        </FieldGroup>
        <FieldGroup label="Sub-headline">
          <Textarea value={data.subheadline} onChange={v => setData(d => ({ ...d, subheadline: v }))} rows={3} />
          <p className="text-xs text-gray-500 mt-1">Gunakan <code className="bg-gray-100 px-1 rounded">&lt;strong&gt;teks&lt;/strong&gt;</code> untuk bold</p>
        </FieldGroup>

        <div className="pt-2">
          <ImageUpload
            value={data.photoUrl}
            onChange={url => setData(d => ({ ...d, photoUrl: url }))}
            label="Foto Hero (opsional)"
            hint="Foto utama di sebelah kanan judul — JPG, PNG, WebP maks. 5 MB"
            aspectRatio="portrait"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Statistik (angka trust)</label>
          <button onClick={addStat} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
            <Plus className="w-3 h-3" /> Tambah
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {data.stats.map((s, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 relative">
              <button onClick={() => removeStat(i)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
              <Input value={s.num} onChange={v => updateStat(i, 'num', v)} placeholder="12+" />
              <Input value={s.label} onChange={v => updateStat(i, 'label', v)} placeholder="Tahun mendampingi" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Teachers Tab ─────────────────────────────────────────────────────────────

function TeachersTab({ initial }: { initial: Teacher[] }) {
  const qc = useQueryClient()
  const [items, setItems] = useState<Teacher[]>(initial)

  useEffect(() => { setItems(initial) }, [initial])

  const { mutate, isPending } = useMutation({
    mutationFn: () => landingApi.upsertContentSection('teachers', items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-content'] }),
  })

  const update = (i: number, field: keyof Teacher, val: string) => {
    setItems(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t))
  }
  const add = () => setItems(p => [...p, { name: '', role: '', badge: '', photoUrl: '' }])
  const remove = (i: number) => setItems(p => p.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Tim Guru ({items.length} guru)</h2>
        <div className="flex gap-2">
          <button onClick={add} className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Plus className="w-4 h-4" /> Tambah Guru
          </button>
          <SaveButton saving={isPending} onClick={() => mutate()} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((t, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
            <button onClick={() => remove(i)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
            <FieldGroup label="Nama Guru">
              <Input value={t.name} onChange={v => update(i, 'name', v)} placeholder="Bu Rini Astuti" />
            </FieldGroup>
            <FieldGroup label="Role / Mapel yang Diajar">
              <Input value={t.role} onChange={v => update(i, 'role', v)} placeholder="Guru AHE & ASE" />
            </FieldGroup>
            <FieldGroup label="Badge (info singkat)">
              <Input value={t.badge} onChange={v => update(i, 'badge', v)} placeholder="7 tahun di KLC" />
            </FieldGroup>
            <ImageUpload
              value={t.photoUrl}
              onChange={url => update(i, 'photoUrl', url)}
              label="Foto Guru"
              hint="JPG, PNG, WebP — maks. 5 MB"
              aspectRatio="square"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Testimonials Tab ─────────────────────────────────────────────────────────

function TestimonialsTab({ initial }: { initial: Testimonial[] }) {
  const qc = useQueryClient()
  const [items, setItems] = useState<Testimonial[]>(initial)

  useEffect(() => { setItems(initial) }, [initial])

  const { mutate, isPending } = useMutation({
    mutationFn: () => landingApi.upsertContentSection('testimonials', items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-content'] }),
  })

  const update = (i: number, field: keyof Testimonial, val: string) => {
    setItems(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t))
  }
  const add = () => setItems(p => [...p, { quote: '', authorName: '', authorMeta: '', initials: '' }])
  const remove = (i: number) => setItems(p => p.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Testimoni ({items.length})</h2>
        <div className="flex gap-2">
          <button onClick={add} className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Plus className="w-4 h-4" /> Tambah
          </button>
          <SaveButton saving={isPending} onClick={() => mutate()} />
        </div>
      </div>

      <div className="space-y-4">
        {items.map((t, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
            <button onClick={() => remove(i)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
            <FieldGroup label="Kutipan">
              <Textarea value={t.quote} onChange={v => update(i, 'quote', v)} rows={3} />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Nama Penulis">
                <Input value={t.authorName} onChange={v => update(i, 'authorName', v)} placeholder="Ibu Diah Hasanah" />
              </FieldGroup>
              <FieldGroup label="Inisial (untuk avatar)">
                <Input value={t.initials} onChange={v => update(i, 'initials', v)} placeholder="DH" />
              </FieldGroup>
            </div>
            <FieldGroup label="Keterangan (wali siapa, berapa lama)">
              <Input value={t.authorMeta} onChange={v => update(i, 'authorMeta', v)} placeholder="Wali Aira · 2 tahun di KLC PWK" />
            </FieldGroup>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── FAQ Tab ──────────────────────────────────────────────────────────────────

function FaqTab({ initial }: { initial: FaqItem[] }) {
  const qc = useQueryClient()
  const [items, setItems] = useState<FaqItem[]>(initial)
  const [expanded, setExpanded] = useState<number | null>(0)

  useEffect(() => { setItems(initial) }, [initial])

  const { mutate, isPending } = useMutation({
    mutationFn: () => landingApi.upsertContentSection('faq', items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-content'] }),
  })

  const update = (i: number, field: keyof FaqItem, val: string) => {
    setItems(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f))
  }
  const add = () => { setItems(p => [...p, { question: '', answer: '' }]); setExpanded(items.length) }
  const remove = (i: number) => { setItems(p => p.filter((_, idx) => idx !== i)); setExpanded(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">FAQ ({items.length} pertanyaan)</h2>
        <div className="flex gap-2">
          <button onClick={add} className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Plus className="w-4 h-4" /> Tambah Pertanyaan
          </button>
          <SaveButton saving={isPending} onClick={() => mutate()} />
        </div>
      </div>

      <div className="space-y-2">
        {items.map((f, i) => (
          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              <span className="truncate mr-4">{f.question || `Pertanyaan ${i + 1}`}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); remove(i) }} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
                {expanded === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {expanded === i && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                <FieldGroup label="Pertanyaan">
                  <Input value={f.question} onChange={v => update(i, 'question', v)} placeholder="Bagaimana cara...?" />
                </FieldGroup>
                <FieldGroup label="Jawaban">
                  <Textarea value={f.answer} onChange={v => update(i, 'answer', v)} rows={4} />
                </FieldGroup>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Gallery Tab ──────────────────────────────────────────────────────────────

function GalleryTab({ initial }: { initial: GalleryItem[] }) {
  const qc = useQueryClient()
  const [items, setItems] = useState<GalleryItem[]>(initial)

  useEffect(() => { setItems(initial) }, [initial])

  const { mutate, isPending } = useMutation({
    mutationFn: () => landingApi.upsertContentSection('gallery', items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-content'] }),
  })

  const update = (i: number, val: string) => setItems(prev => prev.map((g, idx) => idx === i ? { ...g, caption: val } : g))
  const add = () => setItems(p => [...p, { caption: '' }])
  const remove = (i: number) => setItems(p => p.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Galeri ({items.length} foto)</h2>
        <div className="flex gap-2">
          <button onClick={add} className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Plus className="w-4 h-4" /> Tambah
          </button>
          <SaveButton saving={isPending} onClick={() => mutate()} />
        </div>
      </div>
      <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        Catatan: Saat ini galeri menampilkan placeholder warna. Upload foto ke hosting (misal: Cloudinary/Supabase Storage) lalu masukkan URL foto di sini.
      </p>
      <div className="space-y-2">
        {items.map((g, i) => (
          <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3">
            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-xs font-medium flex-shrink-0">
              {i + 1}
            </div>
            <Input value={g.caption} onChange={v => update(i, v)} placeholder={`Keterangan foto ${i + 1}`} />
            <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Contact Tab ──────────────────────────────────────────────────────────────

function ContactTab({ initial }: { initial: ContactContent }) {
  const qc = useQueryClient()
  const [data, setData] = useState<ContactContent>(initial)

  useEffect(() => { setData(initial) }, [initial])

  const { mutate, isPending } = useMutation({
    mutationFn: () => landingApi.upsertContentSection('contact', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-content'] }),
  })

  const f = (field: keyof ContactContent) => (v: string) => setData(d => ({ ...d, [field]: v }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Informasi Kontak</h2>
        <SaveButton saving={isPending} onClick={() => mutate()} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup label="Nomor Telepon (tampil di footer)">
          <Input value={data.phone} onChange={f('phone')} placeholder="08123445566" />
        </FieldGroup>
        <FieldGroup label="Nomor WhatsApp (format internasional, tanpa +)">
          <Input value={data.whatsapp} onChange={f('whatsapp')} placeholder="628123445566" />
        </FieldGroup>
        <FieldGroup label="Email">
          <Input value={data.email} onChange={f('email')} placeholder="halo@klcbimbel.id" />
        </FieldGroup>
        <FieldGroup label="Instagram (username saja)">
          <Input value={data.instagram} onChange={f('instagram')} placeholder="klcbimbel" />
        </FieldGroup>
        <div className="md:col-span-2">
          <FieldGroup label="Pesan default WhatsApp (saat klik tombol WA)">
            <Textarea value={data.waMessage} onChange={f('waMessage')} rows={2} placeholder="Halo KLC Bimbel, saya tertarik coba gratis" />
          </FieldGroup>
        </div>
      </div>
    </div>
  )
}

// ─── Registrations Tab ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Baru', color: 'bg-blue-100 text-blue-700' },
  CONTACTED: { label: 'Dihubungi', color: 'bg-yellow-100 text-yellow-700' },
  SCHEDULED: { label: 'Dijadwalkan', color: 'bg-purple-100 text-purple-700' },
  COMPLETED: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Batal', color: 'bg-gray-100 text-gray-500' },
}

function RegistrationsTab() {
  const router = useRouter()
  const [filterStatus, setFilterStatus] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const qc = useQueryClient()

  const handleJadiSiswa = (reg: any) => {
    const params = new URLSearchParams()
    if (reg.childName) params.set('name', reg.childName)
    if (reg.parentName) params.set('parentName', reg.parentName)
    if (reg.phone) params.set('parentPhone', reg.phone)
    if (reg.grade) params.set('classLevel', reg.grade)
    if (reg.branchCode) params.set('branchCode', reg.branchCode)
    router.push(`/master-data/students/create?${params.toString()}`)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['landing-registrations', filterStatus],
    queryFn: () => landingApi.getRegistrations({ status: filterStatus || undefined, limit: 50 }),
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      landingApi.updateRegistration(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-registrations'] })
      setUpdatingId(null)
    },
  })

  const items = data?.data?.data?.items ?? []
  const total = data?.data?.data?.total ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Pendaftar Coba Gratis ({total} total)</h2>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Belum ada pendaftar</div>
      ) : (
        <div className="space-y-2">
          {items.map((reg: any) => (
            <div key={reg.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{reg.childName}</span>
                    <span className="text-gray-400 text-sm">·</span>
                    <span className="text-sm text-gray-500">{reg.grade}</span>
                    {reg.branchCode && (
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                        {reg.branchCode}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Orang tua: <strong>{reg.parentName}</strong> · {reg.phone}
                  </div>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {(reg.subjects ?? []).map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>
                    ))}
                  </div>
                  {reg.notes && (
                    <div className="mt-1 text-xs text-gray-400 italic">{reg.notes}</div>
                  )}
                  <div className="mt-1 text-xs text-gray-400">
                    {new Date(reg.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[reg.status]?.color ?? ''}`}>
                    {STATUS_LABELS[reg.status]?.label ?? reg.status}
                  </span>
                  <select
                    value={reg.status}
                    disabled={updatingId === reg.id}
                    onChange={e => { setUpdatingId(reg.id); updateStatus({ id: reg.id, status: e.target.value }) }}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <a
                    href={`https://wa.me/${reg.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
                  >
                    WhatsApp
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => handleJadiSiswa(reg)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <UserPlus className="w-3 h-3" />
                    Jadikan Siswa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingContentPage() {
  const [activeTab, setActiveTab] = useState('hero')

  const { data, isLoading } = useQuery({
    queryKey: ['landing-content'],
    queryFn: () => landingApi.getAllContent(),
    staleTime: 0,
  })

  const content = data?.data?.data ?? {}

  const defaultHero: HeroContent = {
    eyebrowText: 'Pendaftaran Tahun Ajaran 2026/2027 Dibuka',
    headline: 'Anak belajar <em>tuntas</em>, orang tua selalu <em>tahu</em>.',
    subheadline: 'Bimbel keluarga dengan metode <strong>Mastery Learning</strong>.',
    stats: [
      { num: '12+', label: 'Tahun mendampingi' },
      { num: '4', label: 'Cabang di Jawa' },
      { num: '1.400+', label: 'Siswa aktif & alumni' },
      { num: '96%', label: 'Kehadiran rata-rata' },
    ],
  }

  const defaultContact: ContactContent = {
    phone: '08123445566', whatsapp: '628123445566',
    email: 'halo@klcbimbel.id', instagram: 'klcbimbel',
    waMessage: 'Halo KLC Bimbel, saya tertarik coba gratis',
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Konten Landing Page</h1>
          </div>
          <p className="text-sm text-gray-500">Edit teks, foto, dan informasi yang tampil di halaman utama website</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <ExternalLink className="w-4 h-4" />
          Preview Landing Page
        </a>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-500">Memuat konten...</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          {activeTab === 'hero' && <HeroTab initial={content.hero ?? defaultHero} />}
          {activeTab === 'teachers' && <TeachersTab initial={content.teachers ?? []} />}
          {activeTab === 'testimonials' && <TestimonialsTab initial={content.testimonials ?? []} />}
          {activeTab === 'faq' && <FaqTab initial={content.faq ?? []} />}
          {activeTab === 'gallery' && <GalleryTab initial={content.gallery ?? []} />}
          {activeTab === 'contact' && <ContactTab initial={content.contact ?? defaultContact} />}
          {activeTab === 'registrations' && <RegistrationsTab />}
        </div>
      )}
    </div>
  )
}
