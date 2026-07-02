interface GuideStepProps {
  number: number
  title: string
  description: string
  children: React.ReactNode
  tip?: string
}

export default function GuideStep({ number, title, description, children, tip }: GuideStepProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 flex-shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
          {number}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-sm text-gray-600 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
      {tip && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3">
          <p className="text-xs text-blue-800">{tip}</p>
        </div>
      )}
    </div>
  )
}
