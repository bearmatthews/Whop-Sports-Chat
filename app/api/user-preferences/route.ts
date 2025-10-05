import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const experienceId = searchParams.get("experienceId")

    if (!userId || !experienceId) {
      return NextResponse.json({ error: "userId and experienceId are required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("experience_id", experienceId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("[v0] Error fetching user preferences:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no preferences exist, return default values
    if (!data) {
      return NextResponse.json({
        preferences: {
          notifications_enabled: true,
        },
      })
    }

    return NextResponse.json({ preferences: data })
  } catch (error) {
    console.error("[v0] Error in GET /api/user-preferences:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, experienceId, notificationsEnabled } = body

    if (!userId || !experienceId || notificationsEnabled === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Upsert the preferences
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          experience_id: experienceId,
          notifications_enabled: notificationsEnabled,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,experience_id",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating user preferences:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preferences: data })
  } catch (error) {
    console.error("[v0] Error in POST /api/user-preferences:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
