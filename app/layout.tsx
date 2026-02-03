import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/providers/AuthProvider";
import Navbar from "../components/layout/Navbar";

export const metadata: Metadata = {
  title: "PaceMate - Trouve ton binôme running",
  description: "Plateforme de mise en relation pour runners de tous niveaux",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
