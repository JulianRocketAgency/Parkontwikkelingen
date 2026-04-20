import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'ParkBouw Vakman',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function VakmanLayout({ children }: { children: React.ReactNode }) {
  return children
}
