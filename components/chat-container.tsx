"use client"

import { useEffect, useRef } from "react"
import { ChatMessageComponent } from "./chat-message"
import { ChatInput } from "./chat-input"
import { useChat } from "@/hooks/use-chat"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff } from "lucide-react"
import { executeSlashCommand } from "@/lib/slash-commands"
import { TypingIndicator } from "./typing-indicator"
import { SettingsDialog } from "./settings-dialog"

interface ChatContainerProps {
  currentUser: {
    id: string
    username: string
    profilePicture?: string
  }
  experienceId?: string
}

export function ChatContainer({ currentUser, experienceId }: ChatContainerProps) {
  const {
    messages,
    sendMessage,
    broadcastTyping,
    addReaction,
    typingUsers,
    isConnected,
    connectionStatus,
    realtimeStatus,
  } = useChat(experienceId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" })
      isFirstRender.current = false
    } else if (!isFirstRender.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = (messageText: string, imageUrl?: string) => {
    sendMessage(messageText, imageUrl, currentUser)
  }

  const handleTyping = (isTyping: boolean) => {
    broadcastTyping(isTyping, currentUser)
  }

  const handleReaction = (messageId: string, emoji: string) => {
    addReaction(messageId, emoji, currentUser)
  }

  const handleCommand = async (command: string) => {
    if (!experienceId) {
      console.error("No experience ID available for command execution")
      return
    }

    const result = await executeSlashCommand(command, {
      experienceId,
      userId: currentUser.id,
      username: currentUser.username,
    })

    if (result.success && result.message) {
      sendMessage(result.message, undefined, currentUser)
    } else if (result.error) {
      sendMessage(`Error: ${result.error}`, undefined, currentUser)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex-1" />
        <SettingsDialog userId={currentUser.id} experienceId={experienceId} />
      </div>

      {!isConnected && (
        <Alert variant="destructive" className="m-4 mb-0">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Websocket {connectionStatus}. Messages cannot be sent or received. Check your Whop app configuration.
          </AlertDescription>
        </Alert>
      )}

      {realtimeStatus !== "SUBSCRIBED" && realtimeStatus !== "disconnected" && (
        <Alert className="m-4 mb-0">
          <AlertDescription>Realtime status: {realtimeStatus}. Check console for details.</AlertDescription>
        </Alert>
      )}

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Be the first to say something!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
                isCurrentUser={message.userId === currentUser.id}
                onReaction={handleReaction}
                currentUserId={currentUser.id}
              />
            ))}
            {typingUsers.size > 0 && <TypingIndicator usernames={Array.from(typingUsers.values())} />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="sticky bottom-0 z-10 bg-background border-t">
        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onCommand={handleCommand}
          sendMessage={sendMessage}
          disabled={!isConnected}
          experienceId={experienceId}
          userId={currentUser.id}
          currentUser={currentUser}
        />
      </div>
    </div>
  )
}
