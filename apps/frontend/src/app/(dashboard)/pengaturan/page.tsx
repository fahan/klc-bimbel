'use client'

import { useEffect, useRef, useState } from 'react'
import { Settings2, Upload, Trash2, Save, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { appSettingsApi } from '@/lib/api/endpoints'
import { useAppSettings } from '@/lib/app-settings-context'

export default function PengaturanPage() {
  const { settings, reload } = useAppSettings()

  const [appName, setAppName] = useState('')
  const [tagline, setTagline] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate from context when loaded
  useEffect(() => {
    setAppName(settings.appName)
    setTagline(settings.tagline)
    setLogoUrl(settings.logoUrl ?? '')
    setLogoPreview(settings.logoUrl ?? null)
  }, [settings])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setLogoPreview(base64)
      setLogoUrl(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleUrlChange = (url: string) => {
    setLogoUrl(url)
    setLogoPreview(url || null)
  }

  const removeLogo = () => {
    setLogoUrl('')
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    if (!appName.trim()) {
      setErrorMsg('Nama aplikasi tidak boleh kosong')
      return
    }
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      await appSettingsApi.update({
        appName: appName.trim(),
        tagline: tagline.trim(),
        logoUrl: logoUrl || undefined,
      })
      setSuccessMsg('Pengaturan berhasil disimpan')
      reload()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message ?? 'Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pengaturan Aplikasi</h1>
          <p className="text-sm text-gray-500">Kustomisasi nama dan logo aplikasi</p>
        </div>
      </div>

      {/* Alert messages */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Logo Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Logo Aplikasi</h2>

        {/* Preview */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-gray-600">
              Upload logo atau masukkan URL gambar. Ukuran maksimal 2MB. Format: PNG, JPG, SVG.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* URL input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Atau masukkan URL logo
          </label>
          <input
            type="url"
            value={logoUrl.startsWith('data:') ? '' : logoUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            {logoUrl.startsWith('data:') ? 'Logo dari file upload aktif' : ''}
          </p>
        </div>
      </div>

      {/* App Info Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Informasi Aplikasi</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nama Aplikasi <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            maxLength={100}
            placeholder="Contoh: KLC Bimbel"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Muncul di sidebar, invoice, dan laporan progress
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tagline / Subtitle</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={150}
            placeholder="Contoh: Manajemen Bimbel Terpadu"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Muncul di bawah nama di sidebar</p>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Preview Sidebar</h2>
        <div className="inline-flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {(appName || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-gray-900">{appName || 'Nama Aplikasi'}</p>
            <p className="text-xs text-gray-500">{tagline || 'Tagline'}</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setAppName(settings.appName)
            setTagline(settings.tagline)
            setLogoUrl(settings.logoUrl ?? '')
            setLogoPreview(settings.logoUrl ?? null)
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  )
}
