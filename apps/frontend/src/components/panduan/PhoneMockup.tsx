export default function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[280px] mx-auto rounded-2xl border border-gray-300 shadow-md overflow-hidden bg-white">
      <div className="h-3 bg-blue-600" />
      <div className="p-3">{children}</div>
    </div>
  )
}
