/**
 * Public share page - disabled in browser-only mode.
 * Sharing requires a database backend.
 */

export default function SharePage() {
  return (
    <div className="min-h-screen bg-[#F6F1E8] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        <h1 className="text-2xl font-semibold text-[#1F2421] mb-4">
          Sharing Not Available
        </h1>
        <p className="text-[#8A8A80] mb-6">
          This instance uses browser-only storage. Sharing visualizations requires a database backend.
        </p>
        <a
          href="/library"
          className="inline-block px-6 py-3 bg-[#C8853F] hover:bg-[#A86B2C] text-white rounded-lg transition-colors"
        >
          Go to Library
        </a>
      </div>
    </div>
  )
}
