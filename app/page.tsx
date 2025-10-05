export default function HomePage() {
  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-3xl font-bold">Whop Chat App</h1>
        <p className="text-muted-foreground">This app is designed to run inside Whop experiences.</p>
        <div className="rounded-lg border border-border bg-muted p-4 text-left text-sm">
          <p className="font-semibold">Setup Instructions:</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
            <li>Configure your Whop app in the developer dashboard</li>
            <li>
              Set the experience path to:{" "}
              <code className="rounded bg-background px-1">/experiences/[experienceId]</code>
            </li>
            <li>Install the app into your Whop</li>
            <li>Access it through your Whop experience</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
