import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JOGA! - Login",
  description: "Entre na sua conta JOGA!",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
