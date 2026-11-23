import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { DeviceProvider } from "@/lib/device";
import {
  OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  jsonLdScript,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  // Preconnect for faster font loading on mobile
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SHEEGOW ACADEMY | Live English Classes",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Live interactive English classes for learners everywhere. Speak with a real teacher, practise every lesson, and learn at your pace.",
  keywords: [
    "SHEEGOW ACADEMY",
    "learn English",
    "live English classes",
    "online English course",
    "IELTS preparation",
    "live English teacher",
    "online English school",
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
    title: "SHEEGOW ACADEMY | Live English Classes",
    description:
      "Learn English through live interactive classes with a real teacher. Open to learners in every country.",
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "SHEEGOW ACADEMY | Live English Classes",
    description:
      "Learn English through live interactive classes with a real teacher.",
    images: [OG_IMAGE.url],
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
    canonical: "/",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript([
            organizationJsonLd(),
            websiteJsonLd(),
          ])}
        />
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
