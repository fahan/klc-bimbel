'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { branchApi, subjectApi, sppRateApi, curriculumModuleApi } from '@/lib/api/endpoints'

export default function MasterDataPage() {
  const [stats, setStats] = useState({
    branches: 0,
    subjects: 0,
    sppRates: 0,
    curriculumModules: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [branchRes, subjectRes, rateRes, moduleRes] = await Promise.all([
          branchApi.getAll(),
          subjectApi.getAll(),
          sppRateApi.getAll(),
          curriculumModuleApi.getAll(),
        ])

        setStats({
          branches: branchRes.data.data?.length || 0,
          subjects: subjectRes.data.data?.length || 0,
          sppRates: rateRes.data.data?.length || 0,
          curriculumModules: moduleRes.data.data?.length || 0,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const cards = [
    {
      title: 'Branches',
      icon: '🏢',
      count: stats.branches,
      href: '/master-data/branches',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Subjects',
      icon: '📚',
      count: stats.subjects,
      href: '/master-data/subjects',
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'SPP Rates',
      icon: '💰',
      count: stats.sppRates,
      href: '/master-data/spp-rates',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Curriculum Modules',
      icon: '📖',
      count: stats.curriculumModules,
      href: '/master-data/curriculum-modules',
      color: 'from-orange-500 to-orange-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Master Data Management</h1>
        <p className="text-gray-600">
          Manage branches, subjects, pricing rates, and curriculum structure for your tutoring system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className={`bg-gradient-to-br ${card.color} rounded-lg shadow-md p-6 text-white hover:shadow-lg hover:scale-105 transition-all cursor-pointer`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <span className="text-3xl">{card.icon}</span>
              </div>
              <div className="text-3xl font-bold">{loading ? '-' : card.count}</div>
              <p className="text-sm text-white/80 mt-2">Click to manage</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/master-data/branches/create"
            className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg p-4 transition-colors"
          >
            <div className="text-2xl mb-2">🏢</div>
            <h3 className="font-semibold text-blue-900">Add Branch</h3>
            <p className="text-sm text-blue-700">Create a new tutoring branch</p>
          </Link>

          <Link
            href="/master-data/subjects/create"
            className="bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg p-4 transition-colors"
          >
            <div className="text-2xl mb-2">📚</div>
            <h3 className="font-semibold text-green-900">Add Subject</h3>
            <p className="text-sm text-green-700">Create a new subject with tracking</p>
          </Link>

          <Link
            href="/master-data/spp-rates/create"
            className="bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-lg p-4 transition-colors"
          >
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-semibold text-purple-900">Add SPP Rate</h3>
            <p className="text-sm text-purple-700">Set subject pricing</p>
          </Link>

          <Link
            href="/master-data/curriculum-modules/create"
            className="bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-lg p-4 transition-colors"
          >
            <div className="text-2xl mb-2">📖</div>
            <h3 className="font-semibold text-orange-900">Add Curriculum</h3>
            <p className="text-sm text-orange-700">Create subject module/chapter</p>
          </Link>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tip</h3>
        <p className="text-sm text-blue-800">
          Start by creating branches and subjects first. Then add SPP rates for pricing and curriculum modules for course structure.
        </p>
      </div>
    </div>
  )
}
