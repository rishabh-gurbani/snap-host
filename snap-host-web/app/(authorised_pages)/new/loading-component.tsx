export default function Loading() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 bg-black border border-gray-800 rounded-lg animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-800 rounded-full" />
            <div>
              <div className="w-32 h-4 bg-gray-800 rounded" />
              <div className="w-24 h-3 bg-gray-800 rounded mt-2" />
            </div>
          </div>
          <div className="w-20 h-8 bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  )
}

