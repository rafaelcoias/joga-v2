import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Calendar, MapPin, History, Search, Heart, Zap, Star } from "lucide-react"

export default function Features() {
  const features = [
    {
      icon: Zap,
      title: "MatchMaking Inteligente",
      description: "Sistema avançado que conecta jogadores com base no nível, localização e disponibilidade.",
      color: "text-blue-600",
    },
    {
      icon: Trophy,
      title: "Sistema de Rankings",
      description: "Compete em modo ranked, sobe de nível e acompanha as tuas estatísticas detalhadas.",
      color: "text-yellow-600",
    },
    {
      icon: Calendar,
      title: "Reserva de Campos",
      description: "Marca campos facilmente através da nossa rede de parceiros com preços competitivos.",
      color: "text-green-600",
    },
    {
      icon: MapPin,
      title: "Mapa de Venues",
      description: "Descobre campos próximos com informações detalhadas, preços e disponibilidade.",
      color: "text-red-600",
    },
    {
      icon: History,
      title: "Histórico Completo",
      description: "Revê todos os teus jogos, estatísticas e até gravações dos melhores momentos.",
      color: "text-purple-600",
    },
    {
      icon: Search,
      title: "Pesquisa de Jogadores",
      description: "Encontra novos parceiros de jogo por localização, nível e desporto favorito.",
      color: "text-indigo-600",
    },
    {
      icon: Heart,
      title: "Sistema de Amigos",
      description: "Adiciona amigos, forma equipas e mantém-te conectado com a tua comunidade desportiva.",
      color: "text-pink-600",
    },
    {
      icon: Star,
      title: "Avaliações e Reviews",
      description: "Sistema de rating que garante jogos de qualidade e fair-play entre todos os utilizadores.",
      color: "text-orange-600",
    },
  ]

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tudo o que precisas para jogar</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A JOGA! oferece todas as ferramentas necessárias para encontrares parceiros, marcares jogos e evoluíres no
            teu desporto favorito.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const isGreenFeature = feature.color === "text-green-600"
            return (
              <Card
                key={index}
                className={`hover:shadow-lg transition-shadow border-0 shadow-md ${isGreenFeature ? "breathe-subtle" : ""}`}
              >
                <CardHeader className="text-center">
                  <div
                    className={`w-12 h-12 mx-auto rounded-lg bg-gray-50 flex items-center justify-center mb-4 ${isGreenFeature ? "breathe-glow" : ""}`}
                  >
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
