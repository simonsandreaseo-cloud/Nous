import type { Metadata, Viewport } from "next";
import { Inter, Michroma, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const michroma = Michroma({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-michroma",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Nous Clinical Tech | Intelligent SEO System",
  description: "Experience the next generation of clinical SEO technology with Nous. High-performance analysis for medical and technical data environments.",
  keywords: ["Clinical SEO", "Intelligent Systems", "Medical Tech", "Bio-Digital Analysis", "Nous Tech"],
  authors: [{ name: "Nous Clinical Team" }],
  // viewport moved to separate export
  alternates: {
    canonical: "https://nous-clinical.tech",
  },
  openGraph: {
    title: "Nous Clinical Tech | Intelligent SEO System",
    description: "Next-generation clinical SEO analytics and bio-digital intelligence.",
    url: "https://nous-clinical.tech",
    siteName: "Nous Clinical Tech",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://nous-clinical.tech/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Nous Clinical Tech Interface preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nous Clinical Tech",
    description: "Next-generation clinical SEO analytics.",
    images: ["https://nous-clinical.tech/og-image.jpg"],
  },
  icons: {
    icon: "/LogoNous.png",
    shortcut: "/LogoNous.png",
    apple: "/LogoNous.png",
  },
};

import { CommandPalette } from "@/components/dashboard/CommandPalette";
import ScrapingMonitor from "@/components/dashboard/ScrapingMonitor";
import { Toaster } from "@/components/ui/Toaster";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 12.2.7 JSON-LD for Search Engines Perfection
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Nous Clinical Tech",
    "operatingSystem": "Web",
    "applicationCategory": "BusinessApplication",
    "description": "Intelligent SEO System with clinical precision.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        {/* 12.3.5 Resource Hints for Perfection */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${michroma.variable} ${jetbrains.variable} font-sans bg-transparent`} suppressHydrationWarning>
        {/* 12.1.7 Accessible Skip Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-foreground focus:text-background focus:rounded-full"
        >
          Skip to navigation
        </a>

        <AuthProvider>
          <CommandPalette />
          <ScrapingMonitor />
          <Toaster />
          {children}
          <SpeedInsights />
        </AuthProvider>


        <noscript>
          <div className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center p-10 text-center">
            <h1 className="text-2xl font-bold mb-4">Javascript Required</h1>
            <p className="text-gray-500 max-w-md">Nous Clinical Tech requires JavaScript to render its immersive 3D clinical environment. Please enable it in your browser settings.</p>
          </div>
        </noscript>
      </body>
    </html>
  );
}
