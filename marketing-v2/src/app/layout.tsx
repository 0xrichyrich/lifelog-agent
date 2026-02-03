import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LifeLog - AI Life Coach That Pays You',
  description: 'Track your day, get AI insights, earn $LIFE tokens',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
