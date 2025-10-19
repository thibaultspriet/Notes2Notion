import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notes2Notion - Capture vos notes",
  description: "Capturez vos notes manuscrites et envoyez-les automatiquement vers Notion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Notes2Notion",
  },
  themeColor: "#667eea",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
