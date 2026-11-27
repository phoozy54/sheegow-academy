import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { DeviceProvider } from "@/lib/device";
import { I18nProvider } from "@/lib/i18n";
import { CompareTray } from "@/components/sheegow/compare-tray";
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
    "Live interactive English classes for learners around the world who want to learn English. Speak with a real teacher, practise every lesson, and learn at your pace.",
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
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-app.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "SHEEGOW ACADEMY | Live English Classes",
    description:
      "Learn English through live interactive classes with a real teacher. For learners around the world who want to improve their English.",
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
      "Learn English through live interactive classes with a real teacher, wherever you are in the world.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the per-request nonce set by src/middleware.ts so Next.js can
  // apply it to its inline scripts (hydration, boot, etc). This lets us
  // drop 'unsafe-inline' from the CSP script-src directive.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
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
        <link rel="apple-touch-icon" href="/icon-app.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-app.png" />
        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
          }}
        />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased bg-background text-foreground`}
      >
        {/* Skip-to-content link for keyboard/screen-reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <DeviceProvider>
              {children}
              <CompareTray />
              <Toaster />
              <SonnerToaster richColors position="top-right" />
            </DeviceProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
