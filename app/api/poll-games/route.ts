import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getScoreboard, getGameScore, type Sport } from "@/lib/espn-api"
import { whopSdk } from "@/lib/whop-sdk"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function postGameUpdate(experienceId: string, gameData: any) {
  try {
    console.log("[v0] Posting game update:", gameData)

    const { error } = await supabase.from("messages").insert({
      experience_id: experienceId,
      user_id: "system",
      username: "Game Bot",
      avatar_url: null,
      content: JSON.stringify(gameData),
    })

    if (error) {
      console.error("[v0] Failed to post game update:", error)
      throw error
    }

    console.log("[v0] Game update posted successfully")

    try {
      const { data: preferences } = await supabase
        .from("user_preferences")
        .select("user_id, notifications_enabled")
        .eq("experience_id", experienceId)
        .eq("notifications_enabled", true)

      const enabledUserIds = preferences?.map((p) => p.user_id) || []

      if (enabledUserIds.length > 0) {
        const homeScore = gameData.homeTeam.score
        const awayScore = gameData.awayTeam.score
        const homeDiff = gameData.previousScores?.home ? Number(homeScore) - Number(gameData.previousScores.home) : 0
        const awayDiff = gameData.previousScores?.away ? Number(awayScore) - Number(gameData.previousScores.away) : 0

        let notificationContent = `${gameData.awayTeam.name} ${awayScore} - ${homeScore} ${gameData.homeTeam.name}`

        if (homeDiff > 0) {
          notificationContent += ` (+${homeDiff} ${gameData.homeTeam.abbreviation})`
        } else if (awayDiff > 0) {
          notificationContent += ` (+${awayDiff} ${gameData.awayTeam.abbreviation})`
        }

        if (gameData.status.state === "post") {
          notificationContent = `Final: ${notificationContent}`
        } else if (gameData.status.clock) {
          notificationContent += ` - ${gameData.status.clock}`
        }

        await whopSdk.notifications.sendPushNotification({
          experienceId,
          userIds: enabledUserIds,
          title: "🏀 Score Update",
          content: notificationContent,
          isMention: true,
        })
        console.log("[v0] Push notification sent to", enabledUserIds.length, "users")
      } else {
        console.log("[v0] No users with notifications enabled for score updates")
      }
    } catch (notifError) {
      console.error("[v0] Failed to send push notification:", notifError)
    }
  } catch (error) {
    console.error("[v0] Failed to post game update:", error)
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Starting game polling...")

    const { data: subscriptions, error: subsError } = await supabase
      .from("game_subscriptions")
      .select("*")
      .eq("is_active", true)

    if (subsError) {
      console.error("[v0] Error fetching subscriptions:", subsError)
      throw subsError
    }

    console.log("[v0] Found", subscriptions?.length || 0, "active subscriptions")

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No active subscriptions", checked: 0, debug: [] })
    }

    let updatesPosted = 0
    const debugInfo: any[] = []

    const subscriptionsBySport = subscriptions.reduce(
      (acc, sub) => {
        const sport = (sub.sport as Sport) || "basketball/nba"
        if (!acc[sport]) acc[sport] = []
        acc[sport].push(sub)
        return acc
      },
      {} as Record<Sport, typeof subscriptions>,
    )

    for (const [sport, subs] of Object.entries(subscriptionsBySport)) {
      try {
        console.log("[v0] Checking", sport, "scoreboard for", subs.length, "subscriptions")
        const scoreboard = await getScoreboard(sport as Sport)

        for (const sub of subs) {
          const game = scoreboard.events.find((e) => e.id === sub.game_id)

          if (!game) {
            console.log("[v0] Game", sub.game_id, "not found - marking inactive")
            await supabase
              .from("game_subscriptions")
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq("id", sub.id)

            await supabase.from("messages").insert({
              experience_id: sub.experience_id,
              user_id: "system",
              username: "Game Bot",
              avatar_url: null,
              content: `Game tracking ended for ${sub.team_name}`,
            })
            continue
          }

          const currentScore = getGameScore(game)
          const lastScoreHome = sub.last_score_home ? Number(sub.last_score_home) : null
          const lastScoreAway = sub.last_score_away ? Number(sub.last_score_away) : null
          const lastPeriod = sub.last_period ? Number(sub.last_period) : null

          if (lastScoreHome === null || lastScoreAway === null) {
            console.log("[v0] First poll for game", sub.game_id, "- establishing baseline scores")
            await supabase
              .from("game_subscriptions")
              .update({
                last_score_home: currentScore.home,
                last_score_away: currentScore.away,
                last_period: game.status.period,
                updated_at: new Date().toISOString(),
              })
              .eq("id", sub.id)
            continue
          }

          const gameDebug = {
            gameId: sub.game_id,
            teamName: sub.team_name,
            currentScore: { home: currentScore.home, away: currentScore.away },
            lastScore: { home: lastScoreHome, away: lastScoreAway },
            currentPeriod: game.status.period,
            lastPeriod: lastPeriod,
            scoreChanged: currentScore.home !== lastScoreHome || currentScore.away !== lastScoreAway,
            periodChanged: game.status.period !== lastPeriod,
          }
          debugInfo.push(gameDebug)

          console.log("[v0] Comparing scores for game", sub.game_id)

          const currentHomeNum = Number(currentScore.home)
          const currentAwayNum = Number(currentScore.away)

          const scoreChanged = currentHomeNum !== lastScoreHome || currentAwayNum !== lastScoreAway
          const periodChanged = game.status.period !== lastPeriod

          console.log("[v0] Game", sub.game_id, "- Score changed:", scoreChanged, "Period changed:", periodChanged)

          if (scoreChanged || periodChanged) {
            const competition = game.competitions[0]
            const homeTeam = competition.competitors.find((c) => c.homeAway === "home")
            const awayTeam = competition.competitors.find((c) => c.homeAway === "away")

            if (homeTeam && awayTeam) {
              const gameUpdateData = {
                homeTeam: {
                  name: homeTeam.team.displayName,
                  abbreviation: homeTeam.team.abbreviation,
                  logo: homeTeam.team.logo,
                  score: homeTeam.score,
                },
                awayTeam: {
                  name: awayTeam.team.displayName,
                  abbreviation: awayTeam.team.abbreviation,
                  logo: awayTeam.team.logo,
                  score: awayTeam.score,
                },
                status: {
                  period: game.status.period,
                  clock: game.status.displayClock,
                  state: game.status.type.state as "pre" | "in" | "post",
                },
                sport: sub.sport || "basketball/nba",
                previousScores: {
                  home: lastScoreHome,
                  away: lastScoreAway,
                },
              }

              await postGameUpdate(sub.experience_id, gameUpdateData)
              updatesPosted++
            }

            await supabase
              .from("game_subscriptions")
              .update({
                last_score_home: currentScore.home,
                last_score_away: currentScore.away,
                last_period: game.status.period,
                updated_at: new Date().toISOString(),
              })
              .eq("id", sub.id)
          }

          if (game.status.type.completed) {
            console.log("[v0] Game", sub.game_id, "completed - marking inactive")
            await supabase
              .from("game_subscriptions")
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq("id", sub.id)

            const competition = game.competitions[0]
            const homeTeam = competition.competitors.find((c) => c.homeAway === "home")
            const awayTeam = competition.competitors.find((c) => c.homeAway === "away")

            if (homeTeam && awayTeam) {
              const finalGameData = {
                homeTeam: {
                  name: homeTeam.team.displayName,
                  abbreviation: homeTeam.team.abbreviation,
                  logo: homeTeam.team.logo,
                  score: homeTeam.score,
                },
                awayTeam: {
                  name: awayTeam.team.displayName,
                  abbreviation: awayTeam.team.abbreviation,
                  logo: awayTeam.team.logo,
                  score: awayTeam.score,
                },
                status: {
                  period: game.status.period,
                  clock: "Final",
                  state: "post" as const,
                },
                sport: sub.sport || "basketball/nba",
                previousScores: {
                  home: lastScoreHome,
                  away: lastScoreAway,
                },
              }

              await postGameUpdate(sub.experience_id, finalGameData)
            }
          }
        }
      } catch (error) {
        console.error(`[v0] Failed to check ${sport} games:`, error)
      }
    }

    console.log("[v0] Polling complete -", updatesPosted, "updates posted")

    return NextResponse.json({
      message: "Polling complete",
      checked: subscriptions.length,
      updates: updatesPosted,
      debug: debugInfo,
    })
  } catch (error) {
    console.error("[v0] Error polling games:", error)
    return NextResponse.json({ error: "Failed to poll games", debug: [] }, { status: 500 })
  }
}
