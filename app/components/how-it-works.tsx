import { Card, CardContent } from "@/components/ui/card"
import { UserPlus, Search, Calendar, Trophy } from "lucide-react"

export default function HowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      title: "1. Cria o teu perfil",
      description: "Regista-te gratuitamente e configura o teu perfil com os teus desportos favoritos e nível de jogo.",
    },
    {
      icon: Search,
      title: "2. Encontra parceiros",
      description: "Usa o nosso sistema de matchmaking para encontrar jogadores compatíveis na tua área.",
    },
    {
      icon: Calendar,
      title: "3. Marca o jogo",
      description: "Escolhe um campo da nossa rede de parceiros e agenda o teu jogo facilmente.",
    },
    {
      icon: Trophy,
      title: "4. Joga e evolui",
      description: "Diverte-te, compete em rankings e acompanha o teu progresso ao longo do tempo.",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Como funciona</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Em apenas 4 passos simples, estarás pronto para encontrar parceiros e jogar o teu desporto favorito.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <Card
                key={index}
                className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow breathe-subtle"
              >
                <CardContent className="p-8">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6 breathe-glow">
                    <Icon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
