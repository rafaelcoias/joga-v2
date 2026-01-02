import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

export default function Pricing() {
  const plans = [
    {
      name: "Gratuito",
      price: "0€",
      period: "para sempre",
      description: "Perfeito para começar a jogar",
      features: [
        "MatchMaking básico",
        "Perfil público",
        "Histórico de jogos",
        "Sistema de amigos",
        "Suporte por email",
      ],
      cta: "Começar Grátis",
      popular: false,
    },
    {
      name: "Pro",
      price: "4.99€",
      period: "por mês",
      description: "Para jogadores sérios",
      features: [
        "Tudo do plano Gratuito",
        "Modo Ranked",
        "Estatísticas avançadas",
        "Reserva prioritária de campos",
        "Sem anúncios",
        "Suporte prioritário",
      ],
      cta: "Começar Teste Grátis",
      popular: true,
    },
    {
      name: "Premium",
      price: "9.99€",
      period: "por mês",
      description: "Para equipas e organizadores",
      features: [
        "Tudo do plano Pro",
        "Criação de torneios",
        "Gestão de equipas",
        "Analytics detalhados",
        "API access",
        "Suporte 24/7",
      ],
      cta: "Contactar Vendas",
      popular: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Preços simples e transparentes</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Começa gratuitamente e faz upgrade quando precisares de mais funcionalidades. Sem contratos ou taxas
            escondidas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${plan.popular ? "border-green-500 shadow-xl scale-105 breathe-slow breathe-glow" : "border-gray-200"}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 breathe-fast">
                  Mais Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">/{plan.period}</span>
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.popular ? "bg-green-600 hover:bg-green-700 breathe-glow" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">
            Todas as subscrições incluem 14 dias de teste grátis. Cancela a qualquer momento.
          </p>
        </div>
      </div>
    </section>
  )
}
