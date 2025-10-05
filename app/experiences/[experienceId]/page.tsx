import { headers } from "next/headers"
import { whopSdk } from "@/lib/whop-sdk"
import { ChatContainer } from "@/components/chat-container"
import { PolymarketTicker } from "@/components/polymarket-ticker"
import { GamePollerClient } from "@/components/game-poller-client"
import { GameNotification } from "@/components/game-notification"

interface ExperiencePageProps {
  params: Promise<{
    experienceId: string
  }>
}

export default async function ExperiencePage({ params }: ExperiencePageProps) {
  console.log("[v0] ExperiencePage rendering, attempting authentication")

  const { experienceId } = await params
  console.log("[v0] Experience ID from URL:", experienceId)

  try {
    const headersList = await headers()
    console.log("[v0] Headers retrieved, verifying user token")

    const { userId } = await whopSdk.verifyUserToken(headersList)
    console.log("[v0] User authenticated successfully:", userId)

    const user = await whopSdk.users.getUser({ userId })
    console.log("[v0] User details fetched:", user.username, "Profile picture:", user.profilePicture?.sourceUrl)

    const currentUser = {
      id: userId,
      username: user.username || "Anonymous",
      profilePicture: user.profilePicture?.sourceUrl,
    }

    return (
      <div className="flex h-screen flex-col">
        <GamePollerClient />
        <GameNotification />
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-sm">
          <PolymarketTicker />
        </div>
        <div className="flex-1 pt-[60px]">
          <ChatContainer currentUser={currentUser} experienceId={experienceId} />
        </div>
      </div>
    )
  } catch (error) {
    console.log("[v0] Authentication error:", (error as Error).message)

    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">Authentication Required</h1>
          <p className="text-muted-foreground">
            This app needs to run inside Whop&apos;s platform to authenticate users.
          </p>
          <div className="rounded-lg border border-border bg-muted p-4 text-left text-sm">
            <p className="font-semibold">For developers:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Ensure your app is configured in the Whop dashboard</li>
              <li>
                Set the experience path to:{" "}
                <code className="rounded bg-background px-1">/experiences/[experienceId]</code>
              </li>
              <li>Enable the dev proxy for local testing</li>
              <li>Install the app into your Whop to test</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }
}
