import { describe, it, expect, vi, beforeEach } from "vitest"

vi.hoisted(() => {
  process.env["BLUESKY_HANDLE"] = "test.bsky.social"
  process.env["BLUESKY_APP_PASSWORD"] = "test-pass"
})

vi.mock("@kud/bsky", () => ({
  searchPosts: vi.fn(),
  getTimeline: vi.fn(),
  getNotifications: vi.fn(),
  getProfile: vi.fn(),
  getThread: vi.fn(),
  createPost: vi.fn(),
  createThread: vi.fn(),
  like: vi.fn(),
  repost: vi.fn(),
  follow: vi.fn(),
}))

import * as bsky from "@kud/bsky"
import {
  followTool,
  likeTool,
  notificationsTool,
  postTool,
  profileTool,
  replyTool,
  searchPostsTool,
  threadTool,
  timelineTool,
} from "../index.js"

const text = (r: { content: Array<{ text: string }> }) => r.content[0]!.text

beforeEach(() => {
  vi.clearAllMocks()
})

describe("read tools", () => {
  it("search_posts returns results and passes the query", async () => {
    vi.mocked(bsky.searchPosts).mockResolvedValue([
      {
        uri: "at://1",
        handle: "a",
        text: "hello",
        createdAt: "",
        likeCount: 0,
        repostCount: 0,
        replyCount: 0,
      },
    ])
    const r = await searchPostsTool({ query: "atproto" })
    expect(text(r)).toContain("hello")
    expect(bsky.searchPosts).toHaveBeenCalledWith("atproto", 25)
  })

  it("timeline returns the feed", async () => {
    vi.mocked(bsky.getTimeline).mockResolvedValue([
      {
        uri: "at://2",
        handle: "b",
        text: "tl",
        createdAt: "",
        likeCount: 0,
        repostCount: 0,
        replyCount: 0,
      },
    ])
    expect(text(await timelineTool({}))).toContain("tl")
  })

  it("profile returns the profile", async () => {
    vi.mocked(bsky.getProfile).mockResolvedValue({
      handle: "kud.io",
      followersCount: 1,
      followsCount: 2,
      postsCount: 3,
    })
    expect(text(await profileTool({ actor: "kud.io" }))).toContain("kud.io")
  })

  it("thread returns posts", async () => {
    vi.mocked(bsky.getThread).mockResolvedValue([])
    expect(text(await threadTool({ url: "https://bsky.app/x" }))).toBe("[]")
  })

  it("returns an error when the library throws", async () => {
    vi.mocked(bsky.getNotifications).mockRejectedValue(new Error("boom"))
    expect(text(await notificationsTool({}))).toContain("Error: boom")
  })
})

describe("gated write tools", () => {
  it("post refuses without confirm", async () => {
    expect(text(await postTool({ text: "hi", confirm: false }))).toContain(
      "confirm: true",
    )
    expect(bsky.createPost).not.toHaveBeenCalled()
  })

  it("post publishes when confirmed", async () => {
    vi.mocked(bsky.createPost).mockResolvedValue({
      uri: "at://posted",
      cid: "c",
    })
    const r = await postTool({ text: "hi", confirm: true })
    expect(text(r)).toContain("at://posted")
    expect(bsky.createPost).toHaveBeenCalledWith("hi")
  })

  it("reply targets the parent when confirmed", async () => {
    vi.mocked(bsky.createPost).mockResolvedValue({ uri: "at://r", cid: "c" })
    await replyTool({ url: "https://bsky.app/p", text: "yo", confirm: true })
    expect(bsky.createPost).toHaveBeenCalledWith("yo", {
      replyTo: "https://bsky.app/p",
    })
  })

  it("like refuses without confirm, then likes", async () => {
    expect(text(await likeTool({ url: "u", confirm: false }))).toContain(
      "confirm: true",
    )
    vi.mocked(bsky.like).mockResolvedValue(undefined)
    expect(text(await likeTool({ url: "u", confirm: true }))).toContain("liked")
  })

  it("follow follows when confirmed", async () => {
    vi.mocked(bsky.follow).mockResolvedValue(undefined)
    expect(
      text(await followTool({ handle: "kud.io", confirm: true })),
    ).toContain("followed")
  })
})
