import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SHEEGOW ACADEMY | Live English Learning Platform",
  description:
    "SHEEGOW ACADEMY teaches English to Somali-speaking students through LIVE interactive online classes. Learn English with expert teachers, real-time video, and live chat.",
  keywords: [
    "SHEEGOW ACADEMY",
    "learn English",
    "live English classes",
    "English for Somalis",
    "online English course",
    "IELTS preparation",
    "English teacher Somalia",
  ],
  authors: [{ name: "SHEEGOW ACADEMY" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "SHEEGOW ACADEMY | Live English Learning Platform",
    description:
      "Learn English through LIVE interactive classes with expert teachers. Built for Somali-speaking students worldwide.",
    siteName: "SHEEGOW ACADEMY",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
