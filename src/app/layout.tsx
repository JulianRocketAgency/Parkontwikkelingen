import type { Metadata } from 'next'
import './globals.css'
import { SidebarWrapper } from '@/components/layout/SidebarWrapper'

export const metadata: Metadata = {
  title: 'ParkBouw',
  description: 'Park ontwikkeling platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="bg-[#f5f5f7] min-h-screen">
        <div className="flex min-h-screen">
          <SidebarWrapper />
          <main className="flex-1 min-w-0 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
