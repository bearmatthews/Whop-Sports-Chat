// Client-side polling utility
export class GamePoller {
  private intervalId: NodeJS.Timeout | null = null
  private isPolling = false

  start(intervalMs = 60000) {
    if (this.isPolling) {
      console.log("[v0] [GamePoller] Already polling")
      return
    }

    this.isPolling = true
    console.log("[v0] [GamePoller] Starting game polling every", intervalMs, "ms")

    // Poll immediately
    this.poll()

    // Then poll on interval
    this.intervalId = setInterval(() => {
      this.poll()
    }, intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isPolling = false
    console.log("[v0] [GamePoller] Stopped game polling")
  }

  private async poll() {
    try {
      console.log("[v0] [GamePoller] Polling for game updates...")
      const response = await fetch("/api/poll-games")

      if (!response.ok) {
        console.error("[v0] [GamePoller] Poll failed with status:", response.status)
        return
      }

      const data = await response.json()
      console.log("[v0] [GamePoller] Poll result:", data)

      if (data.updates > 0) {
        console.log(`[v0] [GamePoller] Posted ${data.updates} game updates`)
      }
    } catch (error) {
      console.error("[v0] [GamePoller] Poll failed:", error)
    }
  }
}

// Singleton instance
export const gamePoller = new GamePoller()
