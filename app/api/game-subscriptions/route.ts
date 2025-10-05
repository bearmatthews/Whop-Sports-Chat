import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getScoreboard, getGameScore, type Sport } from "@/lib/espn-api"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { experienceId, userId, gameId, teamName, sport } = body

    console.log("[v0] Creating subscription for game:", gameId, "sport:", sport)

    if (!experienceId || !userId || !gameId || !teamName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("game_subscriptions")
      .select("*")
      .eq("experience_id", experienceId)
      .eq("game_id", gameId)
      .eq("is_active", true)

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: "Already tracking this game", subscription: existing[0] })
    }

    let initialScoreHome = null
    let initialScoreAway = null
    let initialPeriod = null

    try {
      console.log("[v0] Fetching initial scores from ESPN...")
      const scoreboard = await getScoreboard((sport as Sport) || "basketball/nba")
      console.log("[v0] Scoreboard fetched, events:", scoreboard.events.length)

      const game = scoreboard.events.find((e) => e.id === gameId)
      console.log("[v0] Game found:", !!game)

      if (game) {
        const currentScore = getGameScore(game)
        initialScoreHome = currentScore.home
        initialScoreAway = currentScore.away
        initialPeriod = game.status.period
        console.log(
          "[v0] Initial scores - Home:",
          initialScoreHome,
          "Away:",
          initialScoreAway,
          "Period:",
          initialPeriod,
        )
      } else {
        console.error("[v0] Game not found in scoreboard with ID:", gameId)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch initial scores:", error)
      // Continue with null scores if fetch fails
    }

    console.log("[v0] Storing subscription with scores - Home:", initialScoreHome, "Away:", initialScoreAway)

    // Create new subscription with initial scores
    const { data: result, error } = await supabase
      .from("game_subscriptions")
      .insert({
        experience_id: experienceId,
        user_id: userId,
        game_id: gameId,
        team_name: teamName,
        sport: sport || "basketball/nba",
        last_score_home: initialScoreHome,
        last_score_away: initialScoreAway,
        last_period: initialPeriod,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Subscription created successfully:", result)
    return NextResponse.json({ subscription: result })
  } catch (error) {
    console.error("[v0] Error creating game subscription:", error)
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const experienceId = searchParams.get("experienceId")

    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 })
    }

    const { data: subscriptions, error } = await supabase
      .from("game_subscriptions")
      .select("*")
      .eq("experience_id", experienceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error("Error fetching game subscriptions:", error)
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { experienceId, gameId, teamName } = body

    if (!experienceId || (!gameId && !teamName)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let query = supabase
      .from("game_subscriptions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("experience_id", experienceId)
      .eq("is_active", true)

    if (gameId) {
      query = query.eq("game_id", gameId)
    } else if (teamName) {
      query = query.ilike("team_name", `%${teamName}%`)
    }

    const { error } = await query

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Subscription removed" })
  } catch (error) {
    console.error("Error deleting game subscription:", error)
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, scoreHome, scoreAway, period } = body

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 })
    }

    const { error } = await supabase
      .from("game_subscriptions")
      .update({
        last_score_home: scoreHome,
        last_score_away: scoreAway,
        last_period: period,
        updated_at: new Date().toISOString(),
      })
      .eq("game_id", gameId)
      .eq("is_active", true)

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Subscription updated" })
  } catch (error) {
    console.error("Error updating game subscription:", error)
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
  }
}
