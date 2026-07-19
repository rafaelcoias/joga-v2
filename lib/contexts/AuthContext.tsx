"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { fetchDocument, handleSetDoc, handleEditDoc } from "@/lib/firebase/server";
import { sendWelcomeEmail } from "@/lib/email/emailService";
import { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string): Promise<User | null> => {
    try {
      const userData = await fetchDocument("users", uid);
      return userData as User;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser.uid);
      setUser(userData);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        const userData = await fetchUserData(firebaseUser.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData: Partial<User>
  ) => {
    try {
      // Validate input
      if (!email || !password) {
        throw new Error("Email e password são obrigatórios");
      }

      if (password.length < 6) {
        throw new Error("A password deve ter no mínimo 6 caracteres");
      }

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update Firebase Auth profile
      await updateProfile(userCredential.user, {
        displayName: `${userData.firstName} ${userData.lastName}`,
      });

      // Create user document in Firestore (without id and createdAt - handleSetDoc adds createdAt)
      const newUser: Omit<User, "id" | "createdAt"> = {
        email,
        displayName: `${userData.firstName} ${userData.lastName}`,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        photoURL: userData.photoURL || "",
        bio: userData.bio || "",
        location: userData.location || "",
        phone: userData.phone,
        level: 1,
        wins: 0,
        losses: 0,
        draws: 0,
        goals: 0,
        assists: 0,
        points: 0,
        aces: 0,
        gamesPlayed: 0,
        role: "user", // Default role
        sports: [], // Sports will be added later
        status: "online",
        preferences: {
          notifications: {
            matchInvites: true,
            newMessages: true,
            gameReminders: true,
            weeklyStats: false,
          },
          language: "pt",
          theme: "light",
        },
        privacy: {
          profileVisible: true,
          statsVisible: true,
          onlineStatus: false,
        },
      };

      // Use handleSetDoc to create document with user's UID as the document ID
      await handleSetDoc(userCredential.user.uid, newUser, "users");

      const createdUser = await fetchUserData(userCredential.user.uid);
      setUser(createdUser);

      // Courtesy welcome email — fire-and-forget
      sendWelcomeEmail(email, userData.firstName || "atleta");

      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao JOGA!",
      });
    } catch (error) {
      console.error("Sign up error:", error);

      // Handle specific Firebase Auth errors
      const firebaseError = error as { code?: string; message?: string };
      let errorMessage = "Ocorreu um erro. Tenta novamente.";

      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          errorMessage = "Este email já está registado.";
          break;
        case "auth/invalid-email":
          errorMessage = "Email inválido.";
          break;
        case "auth/weak-password":
          errorMessage = "A password é muito fraca. Usa no mínimo 6 caracteres.";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Registo não permitido. Contacta o suporte.";
          break;
        default:
          errorMessage = firebaseError.message || errorMessage;
      }

      toast({
        title: "Erro ao criar conta",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Validate input
      if (!email || !password) {
        throw new Error("Email e password são obrigatórios");
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const userData = await fetchUserData(userCredential.user.uid);

      // If user document doesn't exist in Firestore, create it
      if (!userData) {
        const newUser: Omit<User, "id" | "createdAt"> = {
          email: userCredential.user.email || email,
          displayName: userCredential.user.displayName || email.split("@")[0],
          firstName: userCredential.user.displayName?.split(" ")[0] || "",
          lastName: userCredential.user.displayName?.split(" ").slice(1).join(" ") || "",
          photoURL: userCredential.user.photoURL || "",
          bio: "",
          location: "",
          phone: undefined,
          level: 1,
          wins: 0,
          losses: 0,
          draws: 0,
          goals: 0,
          assists: 0,
          points: 0,
          aces: 0,
          gamesPlayed: 0,
          preferences: {
            notifications: {
              matchInvites: true,
              newMessages: true,
              gameReminders: true,
              weeklyStats: false,
            },
            language: "pt",
            theme: "light",
          },
          privacy: {
            profileVisible: true,
            statsVisible: true,
            onlineStatus: false,
          },
          role: "user" as const,
        };

        await handleSetDoc(userCredential.user.uid, newUser, "users");
        const createdUser = await fetchUserData(userCredential.user.uid);
        setUser(createdUser);

        toast({
          title: "Login efetuado!",
          description: `Bem-vindo, ${createdUser?.firstName || "utilizador"}!`,
        });
      } else {
        setUser(userData);

        toast({
          title: "Login efetuado!",
          description: `Bem-vindo de volta, ${userData.firstName}!`,
        });
      }
    } catch (error) {
      console.error("Sign in error:", error);

      // Handle specific Firebase Auth errors
      const firebaseError = error as { code?: string; message?: string };
      let errorMessage = "Ocorreu um erro. Tenta novamente.";

      switch (firebaseError.code) {
        case "auth/invalid-email":
          errorMessage = "Email inválido.";
          break;
        case "auth/user-disabled":
          errorMessage = "Esta conta foi desativada.";
          break;
        case "auth/user-not-found":
          errorMessage = "Não existe conta com este email.";
          break;
        case "auth/wrong-password":
          errorMessage = "Password incorreta.";
          break;
        case "auth/invalid-credential":
          errorMessage = "Email ou password incorretos.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Demasiadas tentativas. Tenta novamente mais tarde.";
          break;
        default:
          errorMessage = firebaseError.message || errorMessage;
      }

      toast({
        title: "Erro ao fazer login",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);

      toast({
        title: "Logout efetuado",
        description: "Até breve!",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao fazer logout",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!firebaseUser || !user) {
      throw new Error("No user logged in");
    }

    try {
      // Update Firestore
      await handleEditDoc(firebaseUser.uid, data, "users");

      // Update Firebase Auth profile if name changed
      if (data.firstName || data.lastName) {
        await updateProfile(firebaseUser, {
          displayName: `${data.firstName || user.firstName} ${data.lastName || user.lastName}`,
        });
      }

      // Refresh user data
      await refreshUser();

      toast({
        title: "Perfil atualizado!",
        description: "As tuas alterações foram guardadas.",
      });
    } catch (error) {
      console.error("Update profile error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao atualizar perfil",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUserEmail = async (newEmail: string) => {
    if (!firebaseUser) {
      throw new Error("No user logged in");
    }

    try {
      await updateEmail(firebaseUser, newEmail);
      await handleEditDoc(firebaseUser.uid, { email: newEmail }, "users");
      await refreshUser();

      toast({
        title: "Email atualizado!",
        description: "O teu email foi alterado com sucesso.",
      });
    } catch (error) {
      console.error("Update email error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao atualizar email",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUserPassword = async (newPassword: string) => {
    if (!firebaseUser) {
      throw new Error("No user logged in");
    }

    try {
      await updatePassword(firebaseUser, newPassword);

      toast({
        title: "Password atualizada!",
        description: "A tua password foi alterada com sucesso.",
      });
    } catch (error) {
      console.error("Update password error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao atualizar password",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    user,
    firebaseUser,
    loading,
    signUp,
    signIn,
    signOut,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
