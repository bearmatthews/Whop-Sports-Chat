import { WhopServerSdk } from "@whop/api"

export const whopSdk = WhopServerSdk({
  // This is the appId of your app. You can find this in the "App Settings" section of your app's Whop dashboard.
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,

  // Add your app api key here - this is required.
  // You can get this from the Whop dashboard after creating an app in the "API Keys" section.
  appApiKey: process.env.WHOP_API_KEY!,
})
