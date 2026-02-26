export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#7c3aed" }}
    >
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-white/30 border-t-white mx-auto mb-5"></div>
        <p className="text-base font-medium opacity-90">Cargando...</p>
      </div>
    </div>
  );
}
