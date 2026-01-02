import { Button } from "@/components/ui/button"
import { Play, Download, Users } from "lucide-react"

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-green-50 to-green-100 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 text-2xl sm:text-5xl lg:text-6xl lg:max-w-5xl font-bold leading-tight text-balance bg-text">
              Encontra o teu
              <span className="breathe-subtle"> parceiro</span> de jogo
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              A JOGA! conecta jogadores apaixonados por desporto. Encontra parceiros, marca campos, compete em rankings
              e faz novos amigos através do desporto que amas.
            </p>
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4 breathe-glow">
                <Download className="w-5 h-5 mr-2" />
                Baixar Grátis
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4 bg-transparent">
                <Play className="w-5 h-5 mr-2" />
                Ver Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 breathe-subtle">10K+</div>
                <div className="text-gray-600">Jogadores Ativos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 breathe-subtle">50+</div>
                <div className="text-gray-600">Campos Parceiros</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 breathe-subtle">6</div>
                <div className="text-gray-600">Desportos</div>
              </div>
            </div>
          </div>

          {/* Right Content - App Preview */}
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm mx-auto breathe-slow">
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white mb-6 breathe-glow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center breathe-fast">
                    <span className="text-green-600 font-bold">J!</span>
                  </div>
                  <div>
                    <h3 className="font-bold">JOGA!</h3>
                    <p className="text-green-200 text-sm">Find Your Game</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Futebol • Hoje 19:00</span>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Ténis • Amanhã 15:30</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm">Disponível para iOS e Android</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
