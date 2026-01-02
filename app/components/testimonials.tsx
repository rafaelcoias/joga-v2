import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star } from "lucide-react"

export default function Testimonials() {
  const testimonials = [
    {
      name: "Miguel Santos",
      role: "Jogador de Futebol",
      avatar: "/placeholder.svg?height=60&width=60",
      rating: 5,
      text: "A JOGA! mudou completamente a minha experiência desportiva. Encontrei uma equipa incrível e agora jogo regularmente. Recomendo a todos!",
    },
    {
      name: "Ana Costa",
      role: "Tenista",
      avatar: "/placeholder.svg?height=60&width=60",
      rating: 5,
      text: "Como tenista, era difícil encontrar parceiros do meu nível. Com a JOGA!, encontro sempre alguém para jogar. O sistema de ranking é fantástico!",
    },
    {
      name: "Pedro Oliveira",
      role: "Jogador de Basquetebol",
      avatar: "/placeholder.svg?height=60&width=60",
      rating: 5,
      text: "A facilidade de marcar campos e encontrar jogadores é impressionante. A app é intuitiva e a comunidade é muito acolhedora.",
    },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">O que dizem os nossos utilizadores</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Milhares de jogadores já descobriram novos parceiros e melhoraram o seu jogo com a JOGA!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={testimonial.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {testimonial.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
