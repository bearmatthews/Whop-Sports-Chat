import { findTeamGame, isGameLive, formatGameStatus } from "./espn-api"

export interface SlashCommand {
  command: string
  description: string
  usage: string
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>
}

export interface CommandContext {
  experienceId: string
  userId: string
  username: string
}

export interface CommandResult {
  success: boolean
  message?: string
  error?: string
}

export function parseSlashCommand(input: string): { command: string; args: string[] } | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith("/")) {
    return null
  }

  const parts = trimmed.slice(1).split(/\s+/)
  const command = parts[0].toLowerCase()
  const args = parts.slice(1)

  return { command, args }
}

export function isSlashCommand(input: string): boolean {
  return input.trim().startsWith("/")
}

// Available commands registry
export const SLASH_COMMANDS: Record<string, SlashCommand> = {
  live: {
    command: "live",
    description: "Track live scores for a team's game",
    usage: "/live [team name]",
    handler: async (args, context) => {
      if (args.length === 0) {
        return {
          success: false,
          error: "Please provide a team name. Usage: /live [team name]",
        }
      }

      const teamName = args.join(" ")

      try {
        const game = await findTeamGame(teamName)

        if (!game) {
          return {
            success: false,
            error: `No game found for "${teamName}". Make sure the team name is correct and they have a game today.`,
          }
        }

        if (!isGameLive(game)) {
          return {
            success: true,
            message: `Game found but not live yet: ${formatGameStatus(game)}`,
          }
        }

        // Subscribe to game updates
        const response = await fetch("/api/game-subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            experienceId: context.experienceId,
            userId: context.userId,
            gameId: game.id,
            teamName,
            sport: "basketball/nba",
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to subscribe to game")
        }

        return {
          success: true,
          message: `Now tracking: ${formatGameStatus(game)}`,
        }
      } catch (error) {
        console.error("Error in /live command:", error)
        return {
          success: false,
          error: "Failed to track game. Please try again.",
        }
      }
    },
  },
  stop: {
    command: "stop",
    description: "Stop tracking a team's game",
    usage: "/stop [team name]",
    handler: async (args, context) => {
      if (args.length === 0) {
        return {
          success: false,
          error: "Please provide a team name. Usage: /stop [team name]",
        }
      }

      const teamName = args.join(" ")

      try {
        const response = await fetch("/api/game-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            experienceId: context.experienceId,
            teamName,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to unsubscribe from game")
        }

        return {
          success: true,
          message: `Stopped tracking ${teamName}`,
        }
      } catch (error) {
        console.error("Error in /stop command:", error)
        return {
          success: false,
          error: "Failed to stop tracking game. Please try again.",
        }
      }
    },
  },
  games: {
    command: "games",
    description: "Show all games being tracked",
    usage: "/games",
    handler: async (args, context) => {
      try {
        const response = await fetch(`/api/game-subscriptions?experienceId=${context.experienceId}`)

        if (!response.ok) {
          throw new Error("Failed to fetch game subscriptions")
        }

        const data = await response.json()
        const subscriptions = data.subscriptions || []

        if (subscriptions.length === 0) {
          return {
            success: true,
            message: "No games are currently being tracked. Use /live [team name] to start tracking a game.",
          }
        }

        const gamesList = subscriptions.map((sub: any) => `- ${sub.team_name}`).join("\n")

        return {
          success: true,
          message: `Currently tracking:\n${gamesList}`,
        }
      } catch (error) {
        console.error("Error in /games command:", error)
        return {
          success: false,
          error: "Failed to fetch tracked games. Please try again.",
        }
      }
    },
  },
}

export async function executeSlashCommand(input: string, context: CommandContext): Promise<CommandResult> {
  const parsed = parseSlashCommand(input)

  if (!parsed) {
    return {
      success: false,
      error: "Invalid command format",
    }
  }

  const command = SLASH_COMMANDS[parsed.command]

  if (!command) {
    return {
      success: false,
      error: `Unknown command: /${parsed.command}. Available commands: ${Object.keys(SLASH_COMMANDS).join(", ")}`,
    }
  }

  return await command.handler(parsed.args, context)
}
