export interface ChatMessage {
  id: string
  userId: string
  username: string
  profilePicture?: string
  message: string
  imageUrl?: string
  timestamp: number
  reactions?: Array<{
    emoji: string
    userId: string
    username: string
  }>
}

export type ChatMessagePayload =
  | {
      type: "chat_message"
      data: ChatMessage
    }
  | {
      type: "typing"
      data: TypingIndicator
    }
  | {
      type: "reaction"
      data: ReactionUpdate
    }

export interface TypingIndicator {
  userId: string
  username: string
  isTyping: boolean
}

export interface ReactionUpdate {
  messageId: string
  emoji: string
  userId: string
  username: string
  action: "add" | "remove"
}
