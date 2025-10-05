"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { ChatMessage } from "@/lib/chat-types"
import { formatDistanceToNow } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile } from "lucide-react"
import { GameUpdateCard } from "./game-update-card"

interface ChatMessageProps {
  message: ChatMessage
  isCurrentUser: boolean
  onReaction?: (messageId: string, emoji: string) => void
  currentUserId?: string
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"]

export function ChatMessageComponent({ message, isCurrentUser, onReaction, currentUserId }: ChatMessageProps) {
  const isGameUpdate = message.userId === "system" && message.username === "Game Bot"

  // Try to parse game update data
  let gameUpdateData = null
  if (isGameUpdate && message.message.startsWith("{")) {
    try {
      gameUpdateData = JSON.parse(message.message)
    } catch {
      // Not JSON, render as regular message
    }
  }

  if (gameUpdateData) {
    return <GameUpdateCard data={gameUpdateData} timestamp={message.timestamp} />
  }

  return (
    <div className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={message.profilePicture || "/placeholder.svg"} alt={message.username} />
        <AvatarFallback>{message.username.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className={`flex flex-col gap-1 max-w-[70%] ${isCurrentUser ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{message.username}</span>
          <span>{formatDistanceToNow(message.timestamp, { addSuffix: true })}</span>
        </div>

        <div className="relative group">
          <div
            className={`rounded-lg px-4 py-2 ${
              isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
          >
            {message.imageUrl && (
              <img
                src={message.imageUrl || "/placeholder.svg"}
                alt="Shared image"
                className="rounded-lg max-w-full max-h-64 object-contain mb-2"
              />
            )}
            {message.message && <p className="text-sm leading-relaxed break-words">{message.message}</p>}
          </div>

          {onReaction && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute -bottom-2 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Smile className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <div className="flex gap-1">
                  {REACTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-lg hover:scale-125 transition-transform"
                      onClick={() => onReaction(message.id, emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(
              message.reactions.reduce(
                (acc, r) => {
                  if (!acc[r.emoji]) acc[r.emoji] = []
                  acc[r.emoji].push(r)
                  return acc
                },
                {} as Record<string, typeof message.reactions>,
              ),
            ).map(([emoji, reactions]) => {
              const hasReacted = reactions.some((r) => r.userId === currentUserId)
              return (
                <Button
                  key={emoji}
                  variant={hasReacted ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => onReaction?.(message.id, emoji)}
                >
                  <span>{emoji}</span>
                  <span>{reactions.length}</span>
                </Button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
