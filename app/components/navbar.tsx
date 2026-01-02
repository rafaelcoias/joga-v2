"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center breathe-fast">
              <span className="text-white font-bold text-lg">J!</span>
            </div>
            <span className="text-2xl font-bold text-green-600">JOGA!</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-700 hover:text-green-600 transition-colors">
              Funcionalidades
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-green-600 transition-colors">
              Como Funciona
            </a>
            <a href="#sports" className="text-gray-700 hover:text-green-600 transition-colors">
              Desportos
            </a>
            <a href="#pricing" className="text-gray-700 hover:text-green-600 transition-colors">
              Preços
            </a>
            <Link href="/login">
              <Button variant="outline" className="mr-2">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-green-600 hover:bg-green-700 breathe-glow">
                Registar
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 hover:text-green-600 transition-colors">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-700 hover:text-green-600 transition-colors">
                Funcionalidades
              </a>
              <a href="#how-it-works" className="text-gray-700 hover:text-green-600 transition-colors">
                Como Funciona
              </a>
              <a href="#sports" className="text-gray-700 hover:text-green-600 transition-colors">
                Desportos
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-green-600 transition-colors">
                Preços
              </a>
              <Link href="/login">
                <Button variant="outline" className="w-full mb-2">
                  Entrar
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-green-600 hover:bg-green-700 w-full breathe-glow">
                  Registar
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
