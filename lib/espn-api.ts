export interface ESPNGame {
  id: string
  name: string
  shortName: string
  date: string
  status: {
    type: {
      state: string // "pre" | "in" | "post"
      completed: boolean
    }
    period: number
    displayClock: string
  }
  competitions: Array<{
    id: string
    competitors: Array<{
      id: string
      team: {
        id: string
        name: string
        abbreviation: string
        displayName: string
        logo: string
      }
      score: string
      homeAway: "home" | "away"
    }>
  }>
}

export interface ESPNScoreboard {
  events: ESPNGame[]
}

export type Sport = "basketball/nba" | "football/nfl" | "baseball/mlb" | "hockey/nhl" | "soccer/usa.1"

const ESPN_BASE_URL = "http://site.api.espn.com/apis/site/v2/sports"

export async function getScoreboard(sport: Sport): Promise<ESPNScoreboard> {
  const isServer = typeof window === "undefined"
  const url = isServer ? `${ESPN_BASE_URL}/${sport}/scoreboard` : `/api/espn/scoreboard?sport=${sport}`

  try {
    console.log("[v0] Fetching scoreboard for sport:", sport, "isServer:", isServer)
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Scoreboard API error:", response.status, errorText)
      throw new Error(`ESPN API error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("[v0] Scoreboard data received, events:", data.events?.length || 0)
    return data
  } catch (error) {
    console.error("[v0] Failed to fetch ESPN scoreboard:", error)
    throw error
  }
}

export async function findTeamGame(teamName: string, sport: Sport = "basketball/nba"): Promise<ESPNGame | null> {
  try {
    const scoreboard = await getScoreboard(sport)

    const normalizedTeamName = teamName.toLowerCase()

    const game = scoreboard.events.find((event) => {
      return event.competitions[0].competitors.some((competitor) => {
        const team = competitor.team
        return (
          team.name.toLowerCase().includes(normalizedTeamName) ||
          team.displayName.toLowerCase().includes(normalizedTeamName) ||
          team.abbreviation.toLowerCase().includes(normalizedTeamName)
        )
      })
    })

    return game || null
  } catch (error) {
    console.error("Failed to find team game:", error)
    return null
  }
}

export function isGameLive(game: ESPNGame): boolean {
  return game.status.type.state === "in"
}

export function formatGameStatus(game: ESPNGame): string {
  const competition = game.competitions[0]
  const homeTeam = competition.competitors.find((c) => c.homeAway === "home")
  const awayTeam = competition.competitors.find((c) => c.homeAway === "away")

  if (!homeTeam || !awayTeam) return "Game info unavailable"

  const status = game.status

  if (status.type.state === "pre") {
    return `Upcoming: ${awayTeam.team.displayName} @ ${homeTeam.team.displayName}`
  }

  if (status.type.state === "in") {
    const period = status.period
    const clock = status.displayClock
    return `LIVE Q${period} ${clock}: ${awayTeam.team.displayName} ${awayTeam.score}, ${homeTeam.team.displayName} ${homeTeam.score}`
  }

  if (status.type.completed) {
    return `FINAL: ${awayTeam.team.displayName} ${awayTeam.score}, ${homeTeam.team.displayName} ${homeTeam.score}`
  }

  return "Game status unknown"
}

export function getGameScore(game: ESPNGame): { away: string; home: string } {
  const competition = game.competitions[0]
  const homeTeam = competition.competitors.find((c) => c.homeAway === "home")
  const awayTeam = competition.competitors.find((c) => c.homeAway === "away")

  return {
    away: awayTeam?.score || "0",
    home: homeTeam?.score || "0",
  }
}
