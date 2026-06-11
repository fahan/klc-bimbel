'use client'

import React, { useState } from 'react'
import { Eye, Link2 } from 'lucide-react'
import ViewProgressTab from './components/ViewProgressTab'
import ManageLinksTab, { type LinkPrefill } from './components/ManageLinksTab'

type Tab = 'view' | 'links'

export default function LaporanProgressPage() {
  const [tab, setTab] = useState<Tab>('view')
  const [linkPrefill, setLinkPrefill] = useState<LinkPrefill | null>(null)

  const handleCreateLink = (prefill: LinkPrefill) => {
    setLinkPrefill(prefill)
    setTab('links')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="hidden sm:block">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Laporan Progress Siswa</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Lihat progress siswa langsung atau kirim link laporan ke orang tua
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-1 inline-flex gap-1">
        <button
          onClick={() => setTab('view')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === 'view'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Eye className="w-4 h-4" />
          Lihat Progress Siswa
        </button>
        <button
          onClick={() => setTab('links')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === 'links'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Link2 className="w-4 h-4" />
          Kelola Link
        </button>
      </div>

      {tab === 'view' ? (
        <ViewProgressTab onCreateLink={handleCreateLink} />
      ) : (
        <ManageLinksTab
          prefill={linkPrefill}
          onConsumePrefill={() => setLinkPrefill(null)}
        />
      )}
    </div>
  )
}
