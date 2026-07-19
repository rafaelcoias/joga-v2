import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

export default function Sports() {
  const sports = [
    {
      name: "Futebol",
      description: "O desporto rei! Encontra equipas para jogos de 11 ou futebol de 7.",
      image: "/images/futebol.jpg",
      players: "2.5K+ jogadores",
    },
    {
      name: "Ténis",
      description: "Singles ou pares, encontra o parceiro perfeito para o teu nível.",
      image: "/images/tennis.jpg",
      players: "1.8K+ jogadores",
    },
    {
      name: "Basquetebol",
      description: "3x3 ou 5x5, junta-te à comunidade de basquetebol mais ativa.",
      image: "/images/basketball.png",
      players: "1.2K+ jogadores",
    },
    {
      name: "Padel",
      description: "O desporto que mais cresce! Encontra duplas e adversários.",
      image: "/images/padel.jpeg",
      players: "2.1K+ jogadores",
    },
    {
      name: "Voleibol",
      description: "Praia ou pavilhão, forma a tua equipa de voleibol ideal.",
      image: "/images/volleyball.webp",
      players: "900+ jogadores",
    },
    {
      name: "Futsal",
      description: "Técnica e velocidade em campos cobertos. Joga todo o ano!",
      image: "/images/futsal.webp",
      players: "1.5K+ jogadores",
    },
  ]

  return (
    <section id="sports" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Desportos disponíveis</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Oferecemos uma variedade de desportos para todos os gostos e níveis. Encontra a tua paixão e conecta-te com
            jogadores como tu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sports.map((sport, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-shadow pt-0 group">
              <div className="relative">
                <Image
                  src={sport.image}
                  alt={sport.name}
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover group-hover:blur-[0px] group-hover:brightness-100 blur-[2px] brightness-90 transition-all"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-sm font-medium text-gray-700">{sport.players}</span>
                </div>
              </div>
              <CardContent className="">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{sport.name}</h3>
                <p className="text-gray-600">{sport.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
