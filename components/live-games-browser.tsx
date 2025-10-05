"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, Check } from "lucide-react"
import { type ESPNGame, type Sport, getScoreboard, isGameLive } from "@/lib/espn-api"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LiveGamesBrowserProps {
  experienceId: string
  userId: string
  onTrackGame: (game: ESPNGame, sport: Sport) => Promise<void>
}

const SPORTS: { value: Sport; label: string }[] = [
  { value: "basketball/nba", label: "NBA Basketball" },
  { value: "basketball/wnba", label: "WNBA Basketball" },
  { value: "basketball/mens-college-basketball", label: "NCAA Basketball" },
  { value: "football/nfl", label: "NFL Football" },
  { value: "football/college-football", label: "NCAA Football" },
  { value: "baseball/mlb", label: "MLB Baseball" },
  { value: "hockey/nhl", label: "NHL Hockey" },
  { value: "soccer/usa.1", label: "MLS Soccer" },
  { value: "soccer/eng.1", label: "Premier League" },
  { value: "soccer/esp.1", label: "La Liga" },
  { value: "soccer/uefa.champions", label: "UEFA Champions League" },
  { value: "soccer/ger.1", label: "Bundesliga" },
  { value: "soccer/ita.1", label: "Serie A" },
  { value: "soccer/fra.1", label: "Ligue 1" },
  { value: "soccer/mex.1", label: "Liga MX" },
  { value: "tennis/atp", label: "ATP Tennis" },
  { value: "tennis/wta", label: "WTA Tennis" },
  { value: "golf/pga", label: "PGA Golf" },
  { value: "racing/f1", label: "Formula 1" },
  { value: "racing/nascar", label: "NASCAR" },
  { value: "mma/ufc", label: "UFC" },
]

export function LiveGamesBrowser({ experienceId, userId, onTrackGame }: LiveGamesBrowserProps) {
  const [selectedSport, setSelectedSport] = useState<Sport>("basketball/nba")
  const [games, setGames] = useState<ESPNGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trackingGameId, setTrackingGameId] = useState<string | null>(null)
  const [trackedGameIds, setTrackedGameIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadGames(selectedSport)
    loadTrackedGames()
  }, [selectedSport])

  const loadTrackedGames = async () => {
    try {
      const response = await fetch(`/api/game-subscriptions?experienceId=${experienceId}`)
      if (response.ok) {
        const data = await response.json()
        const gameIds = new Set(data.subscriptions.map((sub: any) => sub.game_id))
        setTrackedGameIds(gameIds)
      }
    } catch (err) {
      console.error("[v0] Failed to load tracked games:", err)
    }
  }

  const loadGames = async (sport: Sport) => {
    setLoading(true)
    setError(null)
    try {
      console.log("[v0] Loading games for sport:", sport)
      const scoreboard = await getScoreboard(sport)
      console.log("[v0] Games loaded:", scoreboard.events?.length || 0)
      setGames(scoreboard.events || [])
    } catch (err) {
      console.error("[v0] Failed to load games:", err)
      setError("Failed to load games. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleUntrackClick = async (e: React.MouseEvent, gameId: string) => {
    e.preventDefault()
    e.stopPropagation()

    setTrackingGameId(gameId)

    try {
      const response = await fetch("/api/game-subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceId, gameId }),
      })

      if (response.ok) {
        setTrackedGameIds((prev) => {
          const next = new Set(prev)
          next.delete(gameId)
          return next
        })
      }
    } catch (error) {
      console.error("[v0] Failed to untrack game:", error)
    } finally {
      setTrackingGameId(null)
    }
  }

  const handleTrackClick = async (e: React.MouseEvent, game: ESPNGame) => {
    e.preventDefault()
    e.stopPropagation()

    setTrackingGameId(game.id)

    try {
      await onTrackGame(game, selectedSport)
      setTrackedGameIds((prev) => new Set(prev).add(game.id))
    } catch (error) {
      console.error("[v0] Failed to track game:", error)
    } finally {
      setTrackingGameId(null)
    }
  }

  const liveGames = games.filter(isGameLive)
  const upcomingGames = games.filter((g) => g.status.type.state === "pre")
  const completedGames = games.filter((g) => g.status.type.completed)

  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const renderGame = (game: ESPNGame) => {
    const competition = game.competitions[0]
    const homeTeam = competition.competitors.find((c) => c.homeAway === "home")
    const awayTeam = competition.competitors.find((c) => c.homeAway === "away")

    if (!homeTeam || !awayTeam) return null

    const isLive = isGameLive(game)
    const isTracking = trackingGameId === game.id
    const isTracked = trackedGameIds.has(game.id)

    const awayLogo = awayTeam.team.logo
    const homeLogo = homeTeam.team.logo

    return (
      <Card key={game.id} className="mb-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                {isLive && (
                  <>
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Q{game.status.period} - {game.status.displayClock}
                    </span>
                  </>
                )}
                {game.status.type.state === "pre" && (
                  <>
                    <Badge variant="secondary">Upcoming</Badge>
                    <span className="text-sm text-muted-foreground">{formatGameTime(game.date)}</span>
                  </>
                )}
                {game.status.type.completed && <Badge variant="outline">Final</Badge>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={awayLogo || "/placeholder.svg"}
                      alt={awayTeam.team.displayName}
                      className="w-8 h-8 object-contain"
                    />
                    <span className="font-medium">{awayTeam.team.displayName}</span>
                  </div>
                  <span className="text-lg font-bold">{awayTeam.score}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={homeLogo || "/placeholder.svg"}
                      alt={homeTeam.team.displayName}
                      className="w-8 h-8 object-contain"
                    />
                    <span className="font-medium">{homeTeam.team.displayName}</span>
                  </div>
                  <span className="text-lg font-bold">{homeTeam.score}</span>
                </div>
              </div>
            </div>

            {isLive && (
              <>
                {isTracked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleUntrackClick(e, game.id)}
                    disabled={isTracking}
                  >
                    {isTracking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Tracking
                      </>
                    )}
                  </Button>
                ) : (
                  <Button size="sm" onClick={(e) => handleTrackClick(e, game)} disabled={isTracking}>
                    {isTracking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Tracking...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Track
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-4">
      <Select value={selectedSport} onValueChange={(v) => setSelectedSport(v as Sport)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a sport" />
        </SelectTrigger>
        <SelectContent>
          {SPORTS.map((sport) => (
            <SelectItem key={sport.value} value={sport.value}>
              {sport.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-muted-foreground">{error}</div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          {liveGames.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Live Now ({liveGames.length})</h3>
              {liveGames.map(renderGame)}
            </div>
          )}

          {upcomingGames.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Upcoming ({upcomingGames.length})</h3>
              {upcomingGames.slice(0, 5).map(renderGame)}
            </div>
          )}

          {completedGames.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Completed ({completedGames.length})</h3>
              {completedGames.slice(0, 5).map(renderGame)}
            </div>
          )}

          {games.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No games found for this sport today</div>
          )}
        </ScrollArea>
      )}
    </div>
  )
}
