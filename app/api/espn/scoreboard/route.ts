import { type NextRequest, NextResponse } from "next/server"

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sport = searchParams.get("sport")

  if (!sport) {
    return NextResponse.json({ error: "Sport parameter is required" }, { status: 400 })
  }

  try {
    console.log("[v0] Fetching ESPN scoreboard for sport:", sport)
    const url = `${ESPN_BASE_URL}/${sport}/scoreboard`

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    })

    if (!response.ok) {
      console.error("[v0] ESPN API error:", response.status, response.statusText)
      throw new Error(`ESPN API error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("[v0] ESPN API success, events count:", data.events?.length || 0)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Failed to fetch ESPN scoreboard:", error)
    return NextResponse.json({ error: "Failed to fetch scoreboard data" }, { status: 500 })
  }
}
