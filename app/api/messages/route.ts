import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { whopSdk } from "@/lib/whop-sdk"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const experienceId = searchParams.get("experienceId")

    if (!experienceId) {
      return NextResponse.json({ error: "experienceId is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("experience_id", experienceId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching messages:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: data })
  } catch (error) {
    console.error("[v0] Error in GET /api/messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { experienceId, userId, username, avatarUrl, content, imageUrl } = body

    if (!experienceId || !userId || !username || (!content && !imageUrl)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("messages")
      .insert({
        experience_id: experienceId,
        user_id: userId,
        username,
        avatar_url: avatarUrl,
        content,
        image_url: imageUrl,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error saving message:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      const { data: preferences } = await supabaseAdmin
        .from("user_preferences")
        .select("user_id, notifications_enabled")
        .eq("experience_id", experienceId)
        .eq("notifications_enabled", true)

      const enabledUserIds = preferences?.map((p) => p.user_id).filter((id) => id !== userId) || []

      if (enabledUserIds.length > 0) {
        await whopSdk.notifications.sendPushNotification({
          experienceId,
          userIds: enabledUserIds,
          title: username,
          content: imageUrl ? "Sent an image" : content,
          senderUserId: userId,
          isMention: true,
        })
        console.log("[v0] Push notification sent to", enabledUserIds.length, "users")
      } else {
        console.log("[v0] No users with notifications enabled")
      }
    } catch (notifError) {
      console.error("[v0] Failed to send push notification:", notifError)
    }

    return NextResponse.json({ message: data })
  } catch (error) {
    console.error("[v0] Error in POST /api/messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { messageId, reactions } = body

    if (!messageId || !reactions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from("messages").update({ reactions }).eq("id", messageId).select().single()

    if (error) {
      console.error("[v0] Error updating reactions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: data })
  } catch (error) {
    console.error("[v0] Error in PATCH /api/messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
