"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Trophy } from "lucide-react"

interface GameUpdate {
  id: string
  message: string
  timestamp: number
}

export function GameNotification() {
  const [updates, setUpdates] = useState<GameUpdate[]>([])

  useEffect(() => {
    // Listen for game updates from the chat
    const handleGameUpdate = (event: CustomEvent<{ message: string }>) => {
      const newUpdate: GameUpdate = {
        id: Date.now().toString(),
        message: event.detail.message,
        timestamp: Date.now(),
      }

      setUpdates((prev) => [...prev, newUpdate])

      // Auto-remove after 10 seconds
      setTimeout(() => {
        setUpdates((prev) => prev.filter((u) => u.id !== newUpdate.id))
      }, 10000)
    }

    window.addEventListener("game-update" as any, handleGameUpdate)

    return () => {
      window.removeEventListener("game-update" as any, handleGameUpdate)
    }
  }, [])

  if (updates.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md">
      {updates.map((update) => (
        <Alert key={update.id} className="animate-in slide-in-from-right">
          <Trophy className="h-4 w-4" />
          <AlertTitle>Game Update</AlertTitle>
          <AlertDescription>{update.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
