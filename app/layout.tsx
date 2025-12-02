import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Header } from "@/components/header"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Free Press Scores - Media Bias & Press Freedom Ratings",
  description:
    "Discover unbiased ratings for news outlets worldwide. Compare media bias scores, fact-check accuracy, ownership transparency, and press freedom metrics across 100+ global news sources.",
  generator: "v0.app",
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Free Press Scores - Media Bias & Press Freedom Ratings",
    description:
      "Discover unbiased ratings for news outlets worldwide. Compare media bias scores, fact-check accuracy, ownership transparency, and press freedom metrics across 100+ global news sources.",
    url: "https://free-press-scores.com",
    siteName: "Free Press Scores",
    images: [
      {
        url: "/images/free-press-scores.jpeg",
        width: 1200,
        height: 630,
        alt: "Free Press Scores - Media Bias & Press Freedom Ratings",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Press Scores - Media Bias & Press Freedom Ratings",
    description:
      "Discover unbiased ratings for news outlets worldwide. Compare media bias scores, fact-check accuracy, and press freedom metrics.",
    images: ["/images/free-press-scores.jpeg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  )
}
