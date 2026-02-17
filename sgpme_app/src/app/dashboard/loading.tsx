export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                HG
              </div>
              <div className="ml-4">
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse mt-1"></div>
              </div>
            </div>
            <div className="h-8 w-32 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3"></div>
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
