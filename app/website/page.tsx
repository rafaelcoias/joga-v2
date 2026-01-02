import Navbar from "../components/navbar"
import Hero from "../components/hero"
import Features from "../components/features"
import HowItWorks from "../components/how-it-works"
import Sports from "../components/sports"
import Testimonials from "../components/testimonials"
import Pricing from "../components/pricing"
import Footer from "../components/footer"

export default function Website() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Sports />
      <Testimonials />
      <Pricing />
      <Footer />
    </div>
  )
}
