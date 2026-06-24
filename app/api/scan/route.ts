import { type NextRequest, NextResponse } from "next/server"
import { fetchRepo, parseRepoUrl } from "@/lib/skillspector/github"
import { scanFiles } from "@/lib/skillspector/engine"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const url = body.url?.trim()
  if (!url) {
    return NextResponse.json({ error: "A GitHub repository URL is required." }, { status: 400 })
  }

  const parsed = parseRepoUrl(url)
  if (!parsed) {
    return NextResponse.json(
      { error: "That doesn't look like a valid GitHub repository URL." },
      { status: 400 },
    )
  }

  try {
    const repo = await fetchRepo(parsed.owner, parsed.repo)
    const result = scanFiles(repo.files, `${repo.owner}/${repo.repo}`, `github.com/${repo.owner}/${repo.repo}`)
    return NextResponse.json({ ...result, branch: repo.branch, truncated: repo.truncated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan repository."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
