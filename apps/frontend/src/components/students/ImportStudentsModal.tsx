'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react'
import { studentApi } from '@/lib/api/endpoints'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ImportResult {
  success: boolean
  total: number
  imported: number
  failed: number
  message: string
  errors?: Array<{
    row: number
    data: any
    error: string
  }>
}

export function ImportStudentsModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
      } else {
        alert('Hanya file CSV yang diterima')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const downloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/templates/template_import_siswa.csv'
    link.download = 'template_import_siswa.csv'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = async () => {
    if (!file) {
      alert('Pilih file CSV terlebih dahulu')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await studentApi.import(formData)

      if (response.data.success) {
        setResult({
          success: true,
          total: response.data.total,
          imported: response.data.imported,
          failed: response.data.failed,
          message: response.data.message,
        })
        // Auto close and refresh after 2 seconds
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 2000)
      } else {
        setResult({
          success: false,
          total: 0,
          imported: 0,
          failed: response.data.errors?.length || 0,
          message: response.data.message,
          errors: response.data.errors,
        })
      }
    } catch (error: any) {
      const errorData = error.response?.data
      console.error('Import error:', errorData || error)

      setResult({
        success: false,
        total: 0,
        imported: 0,
        failed: errorData?.errors?.length || 1,
        message: errorData?.message || 'Gagal mengimport data siswa',
        errors: errorData?.errors || [
          {
            row: 0,
            data: null,
            error: errorData?.message || (error instanceof Error ? error.message : 'Unknown error'),
          },
        ],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    setDragActive(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Import Data Siswa</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!result ? (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Format CSV:</strong> name, classLevel (opsional), parentName (opsional), parentPhone (opsional), branchId
                </p>
              </div>

              {/* Download Template Button */}
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>

              {/* File Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-900 font-medium mb-1">
                  Drag and drop file CSV di sini
                </p>
                <p className="text-sm text-gray-600">atau klik untuk memilih file</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Selected File */}
              {file && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="p-2 hover:bg-gray-200 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || isLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                    file && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin">⏳</div>
                      Loading...
                    </>
                  ) : (
                    'Import'
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Result Display */
            <ImportSummary result={result} onClose={handleClose} />
          )}
        </div>
      </div>
    </div>
  )
}

function ImportSummary({
  result,
  onClose,
}: {
  result: ImportResult
  onClose: () => void
}) {
  return (
    <div className="space-y-6">
      {/* Status */}
      <div className={`flex items-start gap-3 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {result.success ? (
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <h3 className={`font-bold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
            {result.message}
          </h3>
          <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            Total: {result.total} | Berhasil: {result.imported} | Gagal: {result.failed}
          </p>
        </div>
      </div>

      {/* Error Details */}
      {result.errors && result.errors.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-gray-900">Detail Error:</h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {result.errors.slice(0, 10).map((error, idx) => (
              <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                <p className="font-medium text-red-900">Baris {error.row}:</p>
                <p className="text-red-700">{error.error}</p>
                {error.data && (
                  <p className="text-red-600 text-xs mt-1">
                    Data: {error.data.name || 'N/A'} - {error.data.branchId || 'N/A'}
                  </p>
                )}
              </div>
            ))}
            {result.errors.length > 10 && (
              <p className="text-sm text-gray-600">... dan {result.errors.length - 10} error lainnya</p>
            )}
          </div>
        </div>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
      >
        Tutup
      </button>
    </div>
  )
}

// Icon component for download button
function Download({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}
