import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "../components/providers/AuthProvider";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { OverlayProvider } from "../components/providers/OverlayProvider";
import { ChatProvider, ChatContainer } from "../components/chat";
import Navbar from "../components/layout/Navbar";
import OverlayContainer from "../components/overlays/OverlayContainer";

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
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <Suspense fallback={null}>
                <OverlayProvider>
                  <Navbar />
                  <main className="min-h-screen">
                    {children}
                  </main>
                  <OverlayContainer />
                </OverlayProvider>
              </Suspense>
              <ChatContainer />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
