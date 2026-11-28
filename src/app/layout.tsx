import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { cookies, headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { DeviceProvider } from "@/lib/device";
import { I18nProvider } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/translations";
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

const LOCALE_COOKIE = "sheegow_locale";

/** Only the three supported locales are trusted from the cookie. */
function readLocaleCookie(value: string | undefined): Locale {
  return value === "en" || value === "so" || value === "ar"
    ? value
    : DEFAULT_LOCALE;
}

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
  viewportFit: "cover", // enables env(safe-area-inset-*) on notched devices
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
  // Read the per-request nonce set by src/proxy.ts so Next.js can apply it
  // to its own inline scripts and so ours are allowed by the strict CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // G1 / i18n: the locale cookie is the server-side source of truth, so the
  // HTML is rendered in the stored language from the very first byte.
  const initialLocale = readLocaleCookie(
    (await cookies()).get(LOCALE_COOKIE)?.value,
  );

  return (
    <html
      lang={initialLocale}
      dir={LOCALE_META[initialLocale].dir}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={jsonLdScript([
            organizationJsonLd(),
            websiteJsonLd(),
          ])}
        />
        {/* G1 / i18n: keep lang/dir/data-locale in sync with the cookie before
            first paint. The server already rendered in this locale, so there
            is no English flash and no RTL layout flip. CSP requires the nonce. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `try{var m=document.cookie.match(/(?:^|; )sheegow_locale=(en|so|ar)(?:;|$)/);if(m){var l=m[1],d=document.documentElement;d.lang=l;d.setAttribute('dir',l==='ar'?'rtl':'ltr');d.setAttribute('data-locale',l)}}catch(e){}`,
          }}
        />
        {/* PWA / iOS web app capabilities */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SHEEGOW" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-app.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-app.png" />
        {/* Service worker registration — CSP-1: nonce is required */}
        <script
          nonce={nonce}
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
          nonce={nonce}
        >
          <I18nProvider initialLocale={initialLocale}>
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
