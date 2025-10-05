import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { WhopIframeSdkProvider, WhopWebsocketProvider } from "@whop/react"
import "./globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Whop Chat App",
  description: "Real-time chat for Whop communities",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`h-full font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <WhopIframeSdkProvider>
          <Suspense fallback={null}>
            <WhopWebsocketProvider>{children}</WhopWebsocketProvider>
          </Suspense>
        </WhopIframeSdkProvider>
        <Analytics />
      </body>
    </html>
  )
}
