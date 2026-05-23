import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Let's Play Some Chess",
    template: "%s · Let's Play Some Chess",
  },
  description: "Premium multiplayer chess platform. Play online, challenge AI, and climb the ranked leaderboard.",
  keywords: ["chess", "online chess", "multiplayer chess", "chess AI", "stockfish", "ranked chess"],
  authors: [{ name: "Let's Play Some Chess" }],
  openGraph: {
    title: "Let's Play Some Chess",
    description: "Premium multiplayer chess platform — real-time matches, 8-level AI, ranked play.",
    url: "https://letsplaysomechess.com",
    siteName: "Let's Play Some Chess",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Let's Play Some Chess",
    description: "Premium multiplayer chess platform — real-time matches, 8-level AI, ranked play.",
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://letsplaysomechess.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="platform-bg min-h-full flex flex-col text-white">
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(8, 18, 40, 0.97)',
              border: '1px solid rgba(6,182,212,0.18)',
              color: '#e2e8f0',
              backdropFilter: 'blur(20px)',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  );
}
