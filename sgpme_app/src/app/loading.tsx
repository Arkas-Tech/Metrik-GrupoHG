export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-100 border-t-violet-600 mx-auto mb-5"></div>
        <p className="text-sm font-medium text-gray-400">Cargando...</p>
      </div>
    </div>
  );
}
