import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">J!</span>
        </div>
        <p className="text-6xl font-bold text-green-600 mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-600 mb-6">
          A página que procuras não existe ou foi movida.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-md bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 text-sm transition-colors"
          >
            Voltar à app
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 text-sm transition-colors"
          >
            Página inicial
          </Link>
        </div>
      </div>
    </div>
  )
}
