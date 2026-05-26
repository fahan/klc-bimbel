'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { landingApi } from '@/lib/api/endpoints'

interface ImageUploadProps {
  value?: string | null          // current URL
  onChange: (url: string) => void
  label?: string
  hint?: string
  aspectRatio?: 'square' | 'landscape' | 'portrait'
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Foto',
  hint = 'JPG, PNG, WebP — maks. 5 MB',
  aspectRatio = 'landscape',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'portrait'
        ? 'aspect-[3/4]'
        : 'aspect-video'

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, atau WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5 MB')
      return
    }

    setError(null)
    setUploading(true)
    try {
      const res = await landingApi.uploadImage(file)
      onChange(res.data?.data?.url ?? '')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Upload gagal. Coba lagi.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleRemove = () => {
    onChange('')
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      {value ? (
        /* Preview mode */
        <div className="relative group">
          <div className={`${aspectClass} w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50`}>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-white text-gray-800 text-xs font-medium rounded-lg shadow hover:bg-gray-50 transition"
            >
              Ganti foto
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Upload zone */
        <div
          className={`${aspectClass} w-full border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">Mengupload...</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">Klik atau drag foto ke sini</p>
              <p className="text-xs text-gray-400">{hint}</p>
            </>
          )}
        </div>
      )}

      {/* URL manual input */}
      <div className="flex gap-2 items-center">
        <input
          type="url"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Atau tempel URL foto langsung..."
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {value && (
          <button
            type="button"
            onClick={handleRemove}
            className="p-2 text-gray-400 hover:text-red-500 transition"
            title="Hapus foto"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
