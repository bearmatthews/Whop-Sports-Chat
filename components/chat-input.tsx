"use client"

import type React from "react"

import { useState, useRef, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, ImageIcon } from "lucide-react"
import { put } from "@vercel/blob"
import { isSlashCommand } from "@/lib/slash-commands"
import { CommandMenu } from "./command-menu"

interface ChatInputProps {
  onSendMessage: (message: string, imageUrl?: string) => void
  onTyping: (isTyping: boolean) => void
  onCommand?: (command: string) => void
  sendMessage: (
    messageText: string,
    imageUrl?: string,
    user: { id: string; username: string; profilePicture?: string },
  ) => Promise<void>
  disabled?: boolean
  experienceId?: string
  userId?: string
  currentUser?: {
    id: string
    username: string
    profilePicture?: string
  }
}

export function ChatInput({
  onSendMessage,
  onTyping,
  onCommand,
  sendMessage,
  disabled,
  experienceId,
  userId,
  currentUser,
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const handleMessageChange = (value: string) => {
    setMessage(value)

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Notify typing
    if (value.length > 0) {
      onTyping(true)

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false)
      }, 2000)
    } else {
      onTyping(false)
    }
  }

  const handleSend = async () => {
    if ((!message.trim() && !uploadedImageUrl) || disabled) return

    // Check if it's a slash command
    if (isSlashCommand(message) && onCommand) {
      onCommand(message)
      setMessage("")
      setUploadedImageUrl(undefined)
      onTyping(false)
      return
    }

    // Send regular message
    onSendMessage(message, uploadedImageUrl)
    setMessage("")
    setUploadedImageUrl(undefined)
    onTyping(false)

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const blob = await put(file.name, file, {
        access: "public",
      })
      setUploadedImageUrl(blob.url)
    } catch (error) {
      console.error("Failed to upload image:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCommandSelect = (command: string) => {
    setMessage(command)
    textareaRef.current?.focus()
  }

  return (
    <div className="p-4 space-y-2">
      {uploadedImageUrl && (
        <div className="relative inline-block">
          <img
            src={uploadedImageUrl || "/placeholder.svg"}
            alt="Upload preview"
            className="h-20 w-20 rounded object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={() => setUploadedImageUrl(undefined)}
          >
            ×
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <CommandMenu
          experienceId={experienceId || ""}
          userId={userId || ""}
          currentUser={currentUser}
          sendMessage={sendMessage}
          onSelectCommand={handleCommandSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="h-9 w-9"
        >
          <ImageIcon className="h-4 w-4" />
          <span className="sr-only">Upload image</span>
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Disconnected..." : "Type a message or /command..."}
          disabled={disabled || isUploading}
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
        />
        <Button onClick={handleSend} disabled={disabled || isUploading || (!message.trim() && !uploadedImageUrl)}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </div>
  )
}
