import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "19.1.a — Indian Politician Transparency Platform",
    template: "%s | 19.1.a",
  },
  description:
    "Your right to know. Track Indian politician wealth declarations, criminal cases, and parliamentary performance. All data from mandatory public disclosures.",
  keywords: [
    "Indian politicians",
    "criminal cases",
    "asset declaration",
    "Lok Sabha",
    "Rajya Sabha",
    "transparency",
    "accountability",
    "19.1.a",
    "Article 19(1)(a)",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "19.1.a",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexMono.variable} ${ibmPlexSans.variable}`}
    >
      <body className="bg-bg text-text-primary font-sans antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
