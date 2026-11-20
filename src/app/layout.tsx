import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { DeviceProvider } from "@/lib/device";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  // Preconnect for faster font loading on mobile
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: "SHEEGOW ACADEMY | Live English Learning Platform",
    template: "%s | SHEEGOW ACADEMY",
  },
  description:
    "SHEEGOW ACADEMY teaches English to Somali-speaking students through LIVE interactive online classes. Learn English with expert teachers, real-time video, and live chat.",
  keywords: [
    "SHEEGOW ACADEMY",
    "learn English",
    "live English classes",
    "English for Somalis",
    "online English course",
    "IELTS preparation",
    "English teacher Somaliland",
    "Hargeisa English school",
  ],
  authors: [{ name: "SHEEGOW ACADEMY" }],
  creator: "SHEEGOW ACADEMY",
  publisher: "SHEEGOW ACADEMY",
  applicationName: "SHEEGOW ACADEMY",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "SHEEGOW ACADEMY | Live English Learning Platform",
    description:
      "Learn English through LIVE interactive classes with expert teachers. Built for Somali-speaking students worldwide.",
    siteName: "SHEEGOW ACADEMY",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SHEEGOW ACADEMY",
    description:
      "Learn English through LIVE interactive classes with expert teachers.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: "https://sheegowacademy.com",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // allow zoom for accessibility
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#4f46e5" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA / iOS web app capabilities */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SHEEGOW" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased bg-background text-foreground`}
      >
        <DeviceProvider>
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </DeviceProvider>
      </body>
    </html>
  );
}
