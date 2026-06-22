#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import {
  createPost,
  createThread,
  follow,
  getNotifications,
  getProfile,
  getThread,
  getTimeline,
  like,
  repost,
  searchPosts,
} from "@kud/bsky"

if (!process.env["BLUESKY_HANDLE"] || !process.env["BLUESKY_APP_PASSWORD"]) {
  console.error(
    "BLUESKY_HANDLE and BLUESKY_APP_PASSWORD env vars are required (a Bluesky App Password from Settings → App Passwords).",
  )
  process.exit(1)
}

export const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
})

export const err = (msg: string) => ({
  content: [{ type: "text" as const, text: `Error: ${msg}` }],
})

const run = async <T>(fn: () => Promise<T>) => {
  try {
    return ok(await fn())
  } catch (e) {
    return err((e as Error).message)
  }
}

const needConfirm = "Set confirm: true to perform this write action."

// ─── Read ───
export const searchPostsTool = async ({
  query,
  limit,
}: {
  query: string
  limit?: number
}) => run(() => searchPosts(query, limit ?? 25))

export const timelineTool = async ({ limit }: { limit?: number }) =>
  run(() => getTimeline(limit ?? 25))

export const notificationsTool = async ({ limit }: { limit?: number }) =>
  run(() => getNotifications(limit ?? 25))

export const profileTool = async ({ actor }: { actor: string }) =>
  run(() => getProfile(actor))

export const threadTool = async ({ url }: { url: string }) =>
  run(() => getThread(url))

// ─── Write (gated) ───
export const postTool = async ({
  text,
  confirm,
}: {
  text: string
  confirm: boolean
}) => (confirm ? run(() => createPost(text)) : err(needConfirm))

export const threadPostTool = async ({
  posts,
  confirm,
}: {
  posts: string[]
  confirm: boolean
}) => (confirm ? run(() => createThread(posts)) : err(needConfirm))

export const replyTool = async ({
  url,
  text,
  confirm,
}: {
  url: string
  text: string
  confirm: boolean
}) =>
  confirm ? run(() => createPost(text, { replyTo: url })) : err(needConfirm)

export const likeTool = async ({
  url,
  confirm,
}: {
  url: string
  confirm: boolean
}) =>
  confirm ? run(() => like(url).then(() => ({ liked: url }))) : err(needConfirm)

export const repostTool = async ({
  url,
  confirm,
}: {
  url: string
  confirm: boolean
}) =>
  confirm
    ? run(() => repost(url).then(() => ({ reposted: url })))
    : err(needConfirm)

export const followTool = async ({
  handle,
  confirm,
}: {
  handle: string
  confirm: boolean
}) =>
  confirm
    ? run(() => follow(handle).then(() => ({ followed: handle })))
    : err(needConfirm)

const server = new McpServer({ name: "bsky", version: "1.0.0" })

// ─── Read ───
server.registerTool(
  "search_posts",
  {
    description: "Search Bluesky for posts matching a query.",
    inputSchema: {
      query: z.string().describe("Search query"),
      limit: z.number().optional().describe("Max results (default 25)"),
    },
  },
  searchPostsTool,
)
server.registerTool(
  "timeline",
  {
    description: "Get the authenticated user's home timeline.",
    inputSchema: {
      limit: z.number().optional().describe("Max posts (default 25)"),
    },
  },
  timelineTool,
)
server.registerTool(
  "notifications",
  {
    description: "Get the authenticated user's notifications.",
    inputSchema: {
      limit: z.number().optional().describe("Max items (default 25)"),
    },
  },
  notificationsTool,
)
server.registerTool(
  "profile",
  {
    description: "Get a Bluesky profile by handle or DID.",
    inputSchema: { actor: z.string().describe("Handle (e.g. kud.io) or DID") },
  },
  profileTool,
)
server.registerTool(
  "thread",
  {
    description: "Get a post and its replies.",
    inputSchema: { url: z.string().describe("Post URL or at:// URI") },
  },
  threadTool,
)

// ─── Write (gated by confirm) ───
server.registerTool(
  "post",
  {
    description: "Publish a Bluesky post. Requires confirm: true.",
    inputSchema: {
      text: z.string().describe("Post text (≤300 characters)"),
      confirm: z.boolean().default(false).describe("Must be true to publish"),
    },
  },
  postTool,
)
server.registerTool(
  "thread_post",
  {
    description:
      "Publish a self-thread (each post replies to the previous). Requires confirm: true.",
    inputSchema: {
      posts: z.array(z.string()).describe("Ordered post texts"),
      confirm: z.boolean().default(false).describe("Must be true to publish"),
    },
  },
  threadPostTool,
)
server.registerTool(
  "reply",
  {
    description: "Reply to a post. Requires confirm: true.",
    inputSchema: {
      url: z.string().describe("URL or at:// URI of the post to reply to"),
      text: z.string().describe("Reply text (≤300 characters)"),
      confirm: z.boolean().default(false).describe("Must be true to publish"),
    },
  },
  replyTool,
)
server.registerTool(
  "like",
  {
    description: "Like a post. Requires confirm: true.",
    inputSchema: {
      url: z.string().describe("Post URL or at:// URI"),
      confirm: z.boolean().default(false).describe("Must be true to like"),
    },
  },
  likeTool,
)
server.registerTool(
  "repost",
  {
    description: "Repost a post. Requires confirm: true.",
    inputSchema: {
      url: z.string().describe("Post URL or at:// URI"),
      confirm: z.boolean().default(false).describe("Must be true to repost"),
    },
  },
  repostTool,
)
server.registerTool(
  "follow",
  {
    description: "Follow an account. Requires confirm: true.",
    inputSchema: {
      handle: z.string().describe("Handle to follow (e.g. kud.io)"),
      confirm: z.boolean().default(false).describe("Must be true to follow"),
    },
  },
  followTool,
)

const main = async () => {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("mcp-bsky running")
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
