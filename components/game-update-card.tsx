"use client"

import { Card } from "@/components/ui/card"

interface GameUpdateData {
  homeTeam: {
    name: string
    abbreviation: string
    logo: string
    score: string
  }
  awayTeam: {
    name: string
    abbreviation: string
    logo: string
    score: string
  }
  status: {
    period: number
    clock: string
    state: "pre" | "in" | "post"
  }
  sport: string
  previousScores?: {
    home: number
    away: number
  }
}

interface GameUpdateCardProps {
  data: GameUpdateData
  timestamp: number
}

export function GameUpdateCard({ data, timestamp }: GameUpdateCardProps) {
  const { homeTeam, awayTeam, status, previousScores } = data

  const getStatusText = () => {
    if (status.state === "pre") return "Upcoming"
    if (status.state === "post") return "FINAL"
    return `Q${status.period} ${status.clock}`
  }

  const homeScoreDiff = previousScores ? Number(homeTeam.score) - previousScores.home : 0
  const awayScoreDiff = previousScores ? Number(awayTeam.score) - previousScores.away : 0

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-sm bg-gradient-to-br from-card via-card to-muted/50 border border-primary/20 shadow-md overflow-hidden">
        {/* Live indicator */}
        <div className="bg-muted/50 px-3 py-1 text-center border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground">{getStatusText()}</span>
        </div>

        {/* Teams and scores */}
        <div className="p-2">
          {/* Away team */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                <img src={awayTeam.logo || "/placeholder.svg"} alt={awayTeam.name} className="w-7 h-7 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{awayTeam.name}</p>
                <p className="text-xs text-muted-foreground">{awayTeam.abbreviation}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <div className="text-2xl font-bold text-foreground">{awayTeam.score}</div>
              {awayScoreDiff > 0 && <span className="text-sm font-bold text-green-500">+{awayScoreDiff}</span>}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border my-1.5" />

          {/* Home team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                <img src={homeTeam.logo || "/placeholder.svg"} alt={homeTeam.name} className="w-7 h-7 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{homeTeam.name}</p>
                <p className="text-xs text-muted-foreground">{homeTeam.abbreviation}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <div className="text-2xl font-bold text-foreground">{homeTeam.score}</div>
              {homeScoreDiff > 0 && <span className="text-sm font-bold text-green-500">+{homeScoreDiff}</span>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
