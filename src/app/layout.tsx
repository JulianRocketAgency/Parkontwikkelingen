import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ParkBouw',
  description: 'Park ontwikkeling platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="bg-[#f5f5f7] min-h-screen">
        {children}
      </body>
    </html>
  )
}
