import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Header } from '@/components/header'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Free Press Score - Global Media Bias Dashboard',
  description: 'Visualize and analyze media bias, press freedom metrics, and accountability across global news outlets',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
    apple: '/logo.png',
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
