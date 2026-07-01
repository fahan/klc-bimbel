import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export type GuideColor = 'blue' | 'purple' | 'green' | 'orange'

const COLOR_STYLES: Record<
  GuideColor,
  { bg: string; border: string; hoverBg: string; iconText: string; titleText: string }
> = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hoverBg: 'hover:bg-blue-100',
    iconText: 'text-blue-600',
    titleText: 'text-blue-900',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hoverBg: 'hover:bg-purple-100',
    iconText: 'text-purple-600',
    titleText: 'text-purple-900',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    hoverBg: 'hover:bg-green-100',
    iconText: 'text-green-600',
    titleText: 'text-green-900',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    hoverBg: 'hover:bg-orange-100',
    iconText: 'text-orange-600',
    titleText: 'text-orange-900',
  },
}

interface GuideIndexCardProps {
  href: string
  icon: LucideIcon
  color: GuideColor
  title: string
  description: string
}

export default function GuideIndexCard({ href, icon: Icon, color, title, description }: GuideIndexCardProps) {
  const styles = COLOR_STYLES[color]
  return (
    <Link
      href={href}
      className={`block ${styles.bg} ${styles.hoverBg} border ${styles.border} rounded-lg p-4 transition`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 flex-shrink-0 ${styles.iconText}`} />
        <div>
          <p className={`font-semibold text-sm ${styles.titleText}`}>{title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
  )
}
