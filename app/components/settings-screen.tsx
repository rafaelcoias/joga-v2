"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Mail, Lock, Bell, Shield, Smartphone, Eye, EyeOff } from "lucide-react"

export default function SettingsScreen() {
  const [showPassword, setShowPassword] = useState(false)
  const [notifications, setNotifications] = useState({
    matchInvites: true,
    newMessages: true,
    gameReminders: true,
    weeklyStats: false
  })

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    statsVisible: true,
    onlineStatus: false
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Gere as tuas preferências e configurações da conta</p>
      </div>

      <div className="space-y-8">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Perfil
            </CardTitle>
            <CardDescription>
              Atualiza as informações do teu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src="/placeholder.svg?height=80&width=80" />
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline">Alterar Foto</Button>
                <p className="text-sm text-gray-600 mt-1">JPG, PNG até 5MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input id="firstName" defaultValue="João" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apelido</Label>
                <Input id="lastName" defaultValue="Silva" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografia</Label>
              <Input id="bio" placeholder="Conta-nos um pouco sobre ti..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Select defaultValue="lisboa">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lisboa">Lisboa</SelectItem>
                  <SelectItem value="porto">Porto</SelectItem>
                  <SelectItem value="coimbra">Coimbra</SelectItem>
                  <SelectItem value="braga">Braga</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Conta
            </CardTitle>
            <CardDescription>
              Gere as configurações da tua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="joao.silva@email.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telemóvel</Label>
              <Input id="phone" type="tel" defaultValue="+351 912 345 678" />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Alterar Password
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Atual</Label>
                <div className="relative">
                  <Input 
                    id="currentPassword" 
                    type={showPassword ? "text" : "password"} 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacidade
            </CardTitle>
            <CardDescription>
              Controla quem pode ver as tuas informações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Perfil Público</Label>
                <p className="text-sm text-gray-600">Permite que outros utilizadores vejam o teu perfil</p>
              </div>
              <Switch 
                checked={privacy.profileVisible}
                onCheckedChange={(checked) => setPrivacy({...privacy, profileVisible: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Estatísticas Visíveis</Label>
                <p className="text-sm text-gray-600">Mostra as tuas estatísticas no perfil público</p>
              </div>
              <Switch 
                checked={privacy.statsVisible}
                onCheckedChange={(checked) => setPrivacy({...privacy, statsVisible: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Estado Online</Label>
                <p className="text-sm text-gray-600">Mostra quando estás online</p>
              </div>
              <Switch 
                checked={privacy.onlineStatus}
                onCheckedChange={(checked) => setPrivacy({...privacy, onlineStatus: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Escolhe que notificações queres receber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Convites para Jogos</Label>
                <p className="text-sm text-gray-600">Recebe notificações quando te convidarem para jogar</p>
              </div>
              <Switch 
                checked={notifications.matchInvites}
                onCheckedChange={(checked) => setNotifications({...notifications, matchInvites: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Novas Mensagens</Label>
                <p className="text-sm text-gray-600">Notificações de mensagens privadas</p>
              </div>
              <Switch 
                checked={notifications.newMessages}
                onCheckedChange={(checked) => setNotifications({...notifications, newMessages: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lembretes de Jogos</Label>
                <p className="text-sm text-gray-600">Lembra-te dos jogos marcados</p>
              </div>
              <Switch 
                checked={notifications.gameReminders}
                onCheckedChange={(checked) => setNotifications({...notifications, gameReminders: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Relatório Semanal</Label>
                <p className="text-sm text-gray-600">Resumo semanal das tuas atividades</p>
              </div>
              <Switch 
                checked={notifications.weeklyStats}
                onCheckedChange={(checked) => setNotifications({...notifications, weeklyStats: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Aplicação
            </CardTitle>
            <CardDescription>
              Configurações gerais da aplicação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select defaultValue="pt">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tema</Label>
              <Select defaultValue="light">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
