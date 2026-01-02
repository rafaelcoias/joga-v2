"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Trophy, Target, Settings, User, Mail, Lock, Bell, Shield, Smartphone, Eye, EyeOff, Loader2, Building2 } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useCRUD } from "@/hooks/useFirestore"
import { User as UserType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { auth } from "@/lib/firebase/config"

export default function ProfileScreen() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    location: "",
    phone: "",
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Notification preferences
  const [notifications, setNotifications] = useState({
    matchInvites: true,
    newMessages: true,
    gameReminders: true,
    weeklyStats: false,
  })

  // Privacy preferences
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    statsVisible: true,
    onlineStatus: false,
  })

  // App preferences
  const [appSettings, setAppSettings] = useState({
    language: "pt",
    theme: "light",
  })

  // CRUD for user updates
  const { update: updateUser } = useCRUD<UserType>("users")

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        bio: user.bio || "",
        location: user.location || "",
        phone: user.phone || "",
      })
      if (user.preferences?.notifications) {
        setNotifications(user.preferences.notifications)
      }
      if (user.privacy) {
        setPrivacy(user.privacy)
      }
      if (user.preferences) {
        setAppSettings({
          language: user.preferences.language || "pt",
          theme: user.preferences.theme || "light",
        })
      }
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!user?.id) return

    setSaving(true)
    try {
      await updateUser(user.id, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        displayName: `${profileData.firstName} ${profileData.lastName}`,
        bio: profileData.bio,
        location: profileData.location,
        phone: profileData.phone,
      })

      toast({
        title: "Perfil atualizado",
        description: "As tuas informações foram guardadas com sucesso.",
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível guardar as alterações.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!user?.id) return

    setSaving(true)
    try {
      await updateUser(user.id, {
        preferences: {
          notifications,
          language: appSettings.language,
          theme: appSettings.theme,
        },
        privacy,
      })

      toast({
        title: "Configurações guardadas",
        description: "As tuas preferências foram atualizadas.",
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível guardar as configurações.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({
        title: "Erro",
        description: "Por favor preenche todos os campos.",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As passwords não coincidem.",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A password deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }

    setSavingPassword(true)
    try {
      const currentUser = auth.currentUser
      if (!currentUser || !currentUser.email) {
        throw new Error("Utilizador não autenticado")
      }

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      )
      await reauthenticateWithCredential(currentUser, credential)

      // Update password
      await updatePassword(currentUser, passwordData.newPassword)

      toast({
        title: "Password alterada",
        description: "A tua password foi alterada com sucesso.",
      })

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      const firebaseError = error as { code?: string }
      let errorMessage = "Não foi possível alterar a password."

      if (firebaseError.code === "auth/wrong-password") {
        errorMessage = "A password atual está incorreta."
      } else if (firebaseError.code === "auth/weak-password") {
        errorMessage = "A nova password é demasiado fraca."
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">A carregar perfil...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6 text-center">
            <p className="text-yellow-800">Tens de estar autenticado para ver o teu perfil.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Gere o teu perfil e configurações</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader className="flex flex-col items-center">
              <Avatar className="w-28 h-28">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback>
                  {user.displayName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "U"}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="mt-4 flex items-center gap-2">
                {user.displayName || `${user.firstName} ${user.lastName}`}
                <Badge variant="outline">Nível {user.level || 1}</Badge>
              </CardTitle>
              <CardDescription>{user.location || "Portugal"}</CardDescription>
              {user.bio && (
                <p className="text-center text-gray-600 mt-2 max-w-md">{user.bio}</p>
              )}
            </CardHeader>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vitórias</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{user.wins || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Golos</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{user.goals || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assistências</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{user.assists || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações do Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.photoURL} />
                  <AvatarFallback>
                    {user.displayName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline">Alterar Foto</Button>
                  <p className="text-sm text-gray-600 mt-1">JPG, PNG até 5MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apelido</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Input
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Conta-nos um pouco sobre ti..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telemóvel</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+351 912 345 678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Select
                  value={profileData.location.toLowerCase() || "lisboa"}
                  onValueChange={(v) => setProfileData({ ...profileData, location: v.charAt(0).toUpperCase() + v.slice(1) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lisboa">Lisboa</SelectItem>
                    <SelectItem value="porto">Porto</SelectItem>
                    <SelectItem value="coimbra">Coimbra</SelectItem>
                    <SelectItem value="braga">Braga</SelectItem>
                    <SelectItem value="faro">Faro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Conta
              </CardTitle>
              <CardDescription>Gere as configurações da tua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user.email} disabled />
                <p className="text-xs text-gray-500">O email não pode ser alterado</p>
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
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
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
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Alterar Password
                </Button>
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
              <CardDescription>Controla quem pode ver as tuas informações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Perfil Público</Label>
                  <p className="text-sm text-gray-600">Permite que outros utilizadores vejam o teu perfil</p>
                </div>
                <Switch
                  checked={privacy.profileVisible}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, profileVisible: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Estatísticas Visíveis</Label>
                  <p className="text-sm text-gray-600">Mostra as tuas estatísticas no perfil público</p>
                </div>
                <Switch
                  checked={privacy.statsVisible}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, statsVisible: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Estado Online</Label>
                  <p className="text-sm text-gray-600">Mostra quando estás online</p>
                </div>
                <Switch
                  checked={privacy.onlineStatus}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, onlineStatus: checked })}
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
              <CardDescription>Escolhe que notificações queres receber</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Convites para Jogos</Label>
                  <p className="text-sm text-gray-600">Recebe notificações quando te convidarem para jogar</p>
                </div>
                <Switch
                  checked={notifications.matchInvites}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, matchInvites: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Novas Mensagens</Label>
                  <p className="text-sm text-gray-600">Notificações de mensagens privadas</p>
                </div>
                <Switch
                  checked={notifications.newMessages}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, newMessages: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembretes de Jogos</Label>
                  <p className="text-sm text-gray-600">Lembra-te dos jogos marcados</p>
                </div>
                <Switch
                  checked={notifications.gameReminders}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, gameReminders: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatório Semanal</Label>
                  <p className="text-sm text-gray-600">Resumo semanal das tuas atividades</p>
                </div>
                <Switch
                  checked={notifications.weeklyStats}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyStats: checked })}
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
              <CardDescription>Configurações gerais da aplicação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select
                  value={appSettings.language}
                  onValueChange={(v) => setAppSettings({ ...appSettings, language: v })}
                >
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
                <Select
                  value={appSettings.theme}
                  onValueChange={(v) => setAppSettings({ ...appSettings, theme: v })}
                >
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

              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar Configurações
              </Button>
            </CardContent>
          </Card>

          {/* Role Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Tipo de Conta
              </CardTitle>
              <CardDescription>Gere o tipo da tua conta na plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-0.5">
                  <Label>Tipo Atual</Label>
                  <p className="text-sm text-gray-600">
                    {user.role === "organizer" ? "Organizador" : user.role === "admin" ? "Administrador" : "Utilizador"}
                  </p>
                </div>
                <Badge className={
                  user.role === "organizer" ? "bg-blue-100 text-blue-800" :
                  user.role === "admin" ? "bg-purple-100 text-purple-800" :
                  "bg-gray-100 text-gray-800"
                }>
                  {user.role === "organizer" ? "Organizador" : user.role === "admin" ? "Admin" : "Utilizador"}
                </Badge>
              </div>

              {user.role === "user" && (
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Queres ser Organizador?</h4>
                  <p className="text-sm text-blue-700 mb-4">
                    Como organizador podes criar e gerir arenas desportivas, receber reservas e muito mais.
                  </p>
                  <Button
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-100"
                    onClick={async () => {
                      if (!user?.id) return
                      setSaving(true)
                      try {
                        await updateUser(user.id, { role: "organizer" as const })
                        toast({
                          title: "Conta atualizada!",
                          description: "Agora és um organizador. Acede ao menu 'Gerir Arenas' para começar.",
                        })
                      } catch {
                        toast({
                          title: "Erro",
                          description: "Não foi possível atualizar a conta.",
                          variant: "destructive",
                        })
                      } finally {
                        setSaving(false)
                      }
                    }}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
                    Tornar-me Organizador
                  </Button>
                </div>
              )}

              {user.role === "organizer" && (
                <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Conta de Organizador Ativa</h4>
                  <p className="text-sm text-green-700">
                    Podes criar e gerir arenas desportivas através do menu "Gerir Arenas".
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
