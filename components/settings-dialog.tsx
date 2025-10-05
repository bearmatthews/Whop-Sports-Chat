"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SettingsDialogProps {
  userId: string
  experienceId?: string
}

export function SettingsDialog({ userId, experienceId }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && experienceId) {
      fetchPreferences()
    }
  }, [open, experienceId])

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`/api/user-preferences?userId=${userId}&experienceId=${experienceId}`)
      const data = await response.json()

      if (data.preferences) {
        setNotificationsEnabled(data.preferences.notifications_enabled ?? true)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch preferences:", error)
    }
  }

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!experienceId) return

    setLoading(true)
    try {
      const response = await fetch("/api/user-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          experienceId,
          notificationsEnabled: enabled,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update preferences")
      }

      setNotificationsEnabled(enabled)
      toast({
        title: "Settings updated",
        description: `Notifications ${enabled ? "enabled" : "disabled"}`,
      })
    } catch (error) {
      console.error("[v0] Failed to update preferences:", error)
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="flex flex-col gap-1">
              <span>Push Notifications</span>
              <span className="text-sm text-muted-foreground font-normal">
                Receive notifications for new messages and score updates
              </span>
            </Label>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={handleToggleNotifications}
              disabled={loading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
