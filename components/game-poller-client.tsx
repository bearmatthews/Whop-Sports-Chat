"use client"

import { useEffect } from "react"
import { gamePoller } from "@/lib/game-poller"

export function GamePollerClient() {
  useEffect(() => {
    console.log("[v0] GamePollerClient mounted, starting polling...")

    // Start polling when component mounts
    gamePoller.start(60000) // Poll every 60 seconds

    // Stop polling when component unmounts
    return () => {
      gamePoller.stop()
    }
  }, [])

  return null
}
