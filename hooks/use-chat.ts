"use client"

import { useState, useCallback, useEffect } from "react"
import { useOnWebsocketMessage, useBroadcastWebsocketMessage, useWebsocketStatus } from "@whop/react"
import type { ChatMessage, ChatMessagePayload, TypingIndicator, ReactionUpdate } from "@/lib/chat-types"
import { createClient } from "@/lib/supabase/client"

export function useChat(experienceId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [realtimeStatus, setRealtimeStatus] = useState<string>("disconnected")
  const connectionStatus = useWebsocketStatus()
  const isConnected = connectionStatus === "connected"
  const broadcast = useBroadcastWebsocketMessage()

  useEffect(() => {
    if (!experienceId) return

    const loadMessages = async () => {
      try {
        console.log("[v0] Loading messages from database for experience:", experienceId)
        const response = await fetch(`/api/messages?experienceId=${experienceId}`)

        if (!response.ok) {
          throw new Error(`Failed to load messages: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[v0] Loaded messages from database:", data.messages?.length || 0)

        const loadedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          id: msg.id,
          userId: msg.user_id,
          username: msg.username,
          profilePicture: msg.avatar_url,
          message: msg.content,
          imageUrl: msg.image_url,
          timestamp: new Date(msg.created_at).getTime(),
          reactions: msg.reactions || [],
        }))

        setMessages(loadedMessages)
      } catch (error) {
        console.error("[v0] Failed to load messages:", error)
      } finally {
        setIsLoadingMessages(false)
      }
    }

    loadMessages()
  }, [experienceId])

  useEffect(() => {
    if (!experienceId) return

    const supabase = createClient()

    console.log("[v0] Setting up Supabase realtime subscription for experience:", experienceId)

    const channel = supabase
      .channel(`messages:${experienceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `experience_id=eq.${experienceId}`,
        },
        (payload) => {
          console.log("[v0] Received new message from Supabase realtime:", payload)

          const newMessage = payload.new as any
          const chatMessage: ChatMessage = {
            id: newMessage.id,
            userId: newMessage.user_id,
            username: newMessage.username,
            profilePicture: newMessage.avatar_url,
            message: newMessage.content,
            imageUrl: newMessage.image_url,
            timestamp: new Date(newMessage.created_at).getTime(),
            reactions: newMessage.reactions || [],
          }

          setMessages((prev) => {
            // Check if message already exists (avoid duplicates from WebSocket)
            const exists = prev.some((m) => m.id === chatMessage.id)
            if (exists) {
              console.log("[v0] Message already exists, skipping:", chatMessage.id)
              return prev
            }
            console.log("[v0] Adding new message to state:", chatMessage.id)
            return [...prev, chatMessage]
          })
        },
      )
      .subscribe((status) => {
        console.log("[v0] Supabase realtime subscription status:", status)
        setRealtimeStatus(status)

        if (status === "SUBSCRIBED") {
          console.log("[v0] ✅ Realtime connected successfully")
        } else if (status === "CHANNEL_ERROR") {
          console.error("[v0] ❌ Realtime connection error - check if Realtime is enabled on the messages table")
        } else if (status === "TIMED_OUT") {
          console.error("[v0] ❌ Realtime connection timed out")
        }
      })

    return () => {
      console.log("[v0] Cleaning up Supabase realtime subscription")
      supabase.removeChannel(channel)
    }
  }, [experienceId])

  useEffect(() => {
    if (!experienceId) return

    const refreshMessages = async () => {
      try {
        const response = await fetch(`/api/messages?experienceId=${experienceId}`)
        if (!response.ok) return

        const data = await response.json()
        const loadedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          id: msg.id,
          userId: msg.user_id,
          username: msg.username,
          profilePicture: msg.avatar_url,
          message: msg.content,
          imageUrl: msg.image_url,
          timestamp: new Date(msg.created_at).getTime(),
          reactions: msg.reactions || [],
        }))

        setMessages((prev) => {
          // Only update if there are new messages
          if (loadedMessages.length > prev.length) {
            console.log("[v0] Refreshed messages - found", loadedMessages.length - prev.length, "new messages")
            return loadedMessages
          }
          return prev
        })
      } catch (error) {
        console.error("[v0] Failed to refresh messages:", error)
      }
    }

    // Refresh every 5 seconds as a fallback
    const interval = setInterval(refreshMessages, 5000)

    return () => clearInterval(interval)
  }, [experienceId])

  useOnWebsocketMessage((message) => {
    console.log("[v0] Received websocket message:", message)

    try {
      const payload: ChatMessagePayload = JSON.parse(message.json)

      if (payload.type === "chat_message") {
        console.log("[v0] Adding chat message to state:", payload.data)
        const chatMessage = payload.data as ChatMessage
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === chatMessage.id)
          if (exists) return prev
          return [...prev, chatMessage]
        })
      } else if (payload.type === "typing") {
        const typingData = payload.data as TypingIndicator
        setTypingUsers((prev) => {
          const next = new Map(prev)
          if (typingData.isTyping) {
            next.set(typingData.userId, typingData.username)
          } else {
            next.delete(typingData.userId)
          }
          return next
        })
      } else if (payload.type === "reaction") {
        const reactionData = payload.data as ReactionUpdate
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === reactionData.messageId) {
              const reactions = msg.reactions || []
              if (reactionData.action === "add") {
                const hasReaction = reactions.some(
                  (r) => r.emoji === reactionData.emoji && r.userId === reactionData.userId,
                )
                if (!hasReaction) {
                  return {
                    ...msg,
                    reactions: [
                      ...reactions,
                      {
                        emoji: reactionData.emoji,
                        userId: reactionData.userId,
                        username: reactionData.username,
                      },
                    ],
                  }
                }
              } else {
                return {
                  ...msg,
                  reactions: reactions.filter(
                    (r) => !(r.emoji === reactionData.emoji && r.userId === reactionData.userId),
                  ),
                }
              }
            }
            return msg
          }),
        )
      }
    } catch (error) {
      console.error("[v0] Failed to parse websocket message:", error)
    }
  })

  const sendMessage = useCallback(
    async (messageText: string, imageUrl?: string, user: { id: string; username: string; profilePicture?: string }) => {
      if (!messageText.trim() && !imageUrl) {
        console.log("[v0] Cannot send message - empty message and no image")
        return
      }

      if (!isConnected) {
        console.error("[v0] Cannot send message - websocket not connected. Status:", connectionStatus)
        return
      }

      try {
        console.log("[v0] Sending message...")

        // Save to database first to get the real ID
        if (experienceId) {
          const saveResponse = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              experienceId,
              userId: user.id,
              username: user.username,
              avatarUrl: user.profilePicture,
              content: messageText.trim(),
              imageUrl,
            }),
          })

          if (!saveResponse.ok) {
            console.error("[v0] Failed to save message to database")
            return
          }

          const savedMessage = await saveResponse.json()
          console.log("[v0] Message saved to database with ID:", savedMessage.message?.id)

          const chatMessage: ChatMessage = {
            id: savedMessage.message.id,
            userId: user.id,
            username: user.username,
            profilePicture: user.profilePicture,
            message: messageText.trim(),
            imageUrl,
            timestamp: new Date(savedMessage.message.created_at).getTime(),
            reactions: [],
          }

          const payload: ChatMessagePayload = {
            type: "chat_message",
            data: chatMessage,
          }

          await broadcast({
            message: JSON.stringify(payload),
            target: { experience: experienceId },
          })

          console.log("[v0] Message sent successfully")
        }
      } catch (error) {
        console.error("[v0] Failed to send message:", error)
      }
    },
    [broadcast, experienceId, isConnected, connectionStatus],
  )

  const broadcastTyping = useCallback(
    async (isTyping: boolean, user: { id: string; username: string }) => {
      if (!isConnected) return

      const payload: ChatMessagePayload = {
        type: "typing",
        data: {
          userId: user.id,
          username: user.username,
          isTyping,
        },
      }

      try {
        await broadcast({
          message: JSON.stringify(payload),
          target: experienceId ? { experience: experienceId } : "everyone",
        })
      } catch (error) {
        console.error("[v0] Failed to broadcast typing:", error)
      }
    },
    [broadcast, experienceId, isConnected],
  )

  const addReaction = useCallback(
    async (messageId: string, emoji: string, user: { id: string; username: string }) => {
      if (!isConnected) return

      const message = messages.find((m) => m.id === messageId)
      if (!message) return

      const hasReaction = message.reactions?.some((r) => r.emoji === emoji && r.userId === user.id)
      const action = hasReaction ? "remove" : "add"

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const reactions = msg.reactions || []
            if (action === "add") {
              return {
                ...msg,
                reactions: [...reactions, { emoji, userId: user.id, username: user.username }],
              }
            } else {
              return {
                ...msg,
                reactions: reactions.filter((r) => !(r.emoji === emoji && r.userId === user.id)),
              }
            }
          }
          return msg
        }),
      )

      const payload: ChatMessagePayload = {
        type: "reaction",
        data: {
          messageId,
          emoji,
          userId: user.id,
          username: user.username,
          action,
        },
      }

      try {
        await broadcast({
          message: JSON.stringify(payload),
          target: experienceId ? { experience: experienceId } : "everyone",
        })

        const updatedMessage = messages.find((m) => m.id === messageId)
        if (updatedMessage && experienceId) {
          await fetch("/api/messages", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageId,
              reactions: updatedMessage.reactions,
            }),
          })
        }
      } catch (error) {
        console.error("[v0] Failed to add reaction:", error)
      }
    },
    [broadcast, experienceId, isConnected, messages],
  )

  return {
    messages,
    sendMessage,
    broadcastTyping,
    addReaction,
    typingUsers,
    isConnected,
    connectionStatus,
    isLoadingMessages,
    realtimeStatus,
  }
}
