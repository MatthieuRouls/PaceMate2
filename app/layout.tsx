import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/providers/AuthProvider";
import { ChatProvider, ChatContainer } from "../components/chat";
import Navbar from "../components/layout/Navbar";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pacemate.app';

export const metadata: Metadata = {
  title: {
    default: "PaceMate - Trouve ton binôme running",
    template: "%s | PaceMate",
  },
  description: "Trouve des partenaires de running près de chez toi. Rejoins des sessions, améliore tes performances et cours en groupe.",
  metadataBase: new URL(siteUrl),
  keywords: ["running", "course à pied", "partenaire running", "sortie running", "running group"],
  authors: [{ name: "PaceMate" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "PaceMate",
    title: "PaceMate - Trouve ton binôme running",
    description: "Trouve des partenaires de running près de chez toi. Rejoins des sessions, améliore tes performances et cours en groupe.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "PaceMate - Plateforme de running",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PaceMate - Trouve ton binôme running",
    description: "Trouve des partenaires de running près de chez toi.",
    images: ["/og-default.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PaceMate",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#C8FF00" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
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
      </body>
    </html>
  );
}
