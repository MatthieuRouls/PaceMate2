import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/providers/AuthProvider";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { ChatProvider, ChatContainer } from "../components/chat";
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
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <Navbar />
              <main className="min-h-screen">
                {children}
              </main>
              <ChatContainer />
              {/* Portal root for glass overlays */}
              <div id="overlay-root" />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
