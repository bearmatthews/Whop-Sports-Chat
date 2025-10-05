"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trophy } from "lucide-react"
import { LiveGamesBrowser } from "./live-games-browser"
import type { ESPNGame, Sport } from "@/lib/espn-api"
import { useToast } from "@/hooks/use-toast"
import { formatGameStatus } from "@/lib/espn-api"

interface CommandMenuProps {
  experienceId: string
  userId: string
  currentUser?: {
    id: string
    username: string
    profilePicture?: string
  }
  sendMessage: (
    messageText: string,
    imageUrl?: string,
    user: { id: string; username: string; profilePicture?: string },
  ) => Promise<void>
  onSelectCommand: (command: string) => void
}

export function CommandMenu({ experienceId, userId, currentUser, sendMessage, onSelectCommand }: CommandMenuProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const handleTrackGame = async (game: ESPNGame, sport: Sport) => {
    try {
      const competition = game.competitions[0]
      const homeTeam = competition.competitors.find((c) => c.homeAway === "home")
      const awayTeam = competition.competitors.find((c) => c.homeAway === "away")

      if (!homeTeam || !awayTeam) {
        throw new Error("Missing team data")
      }

      const teamName = homeTeam.team.displayName

      const subscriptionResponse = await fetch("/api/game-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          userId,
          gameId: game.id,
          teamName,
          sport,
        }),
      })

      const subscriptionData = await subscriptionResponse.json()

      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.error || "Failed to subscribe to game")
      }

      const gameStatus = formatGameStatus(game)

      if (currentUser) {
        await sendMessage(`📊 Now tracking: ${gameStatus}`, undefined, {
          id: currentUser.id,
          username: currentUser.username,
          profilePicture: currentUser.profilePicture,
        })
      }

      toast({
        title: "Success!",
        description: `Now tracking ${awayTeam.team.displayName} vs ${homeTeam.team.displayName}`,
      })

      setOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to track game",
        variant: "destructive",
      })
      throw error
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Trophy className="h-4 w-4" />
          <span className="sr-only">Open game selector</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Live Games</DialogTitle>
          <DialogDescription>Browse and track live sports games</DialogDescription>
        </DialogHeader>
        <LiveGamesBrowser experienceId={experienceId} userId={userId} onTrackGame={handleTrackGame} />
      </DialogContent>
    </Dialog>
  )
}
