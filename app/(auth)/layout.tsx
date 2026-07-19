import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JOGA! - Entrar",
  description: "Entra na tua conta JOGA! ou cria uma nova.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
