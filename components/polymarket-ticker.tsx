"use client"

export function PolymarketTicker() {
  return (
    <div className="w-full border-b bg-background">
      <iframe
        src="https://ticker.polymarket.com/embed?category=Sports&theme=dark&speed=1.5&showPrices=false"
        width="100%"
        height="60"
        style={{ border: "none", overflow: "hidden" }}
        title="Polymarket Ticker"
      />
    </div>
  )
}
