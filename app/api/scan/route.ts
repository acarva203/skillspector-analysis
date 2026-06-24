import { type NextRequest, NextResponse } from "next/server"
import { fetchRepo, parseRepoUrl } from "@/lib/skillspector/github"
import { scanFiles, computeScore } from "@/lib/skillspector/engine"
import { checkDependencies } from "@/lib/skillspector/dependencies"
import type { Severity } from "@/lib/skillspector/types"

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

    // Run static scan and CVE lookup in parallel to save time.
    const [result, cveFindings] = await Promise.all([
      Promise.resolve(scanFiles(repo.files, `${repo.owner}/${repo.repo}`, `github.com/${repo.owner}/${repo.repo}`)),
      checkDependencies(repo.files),
    ])

    if (cveFindings.length > 0) {
      result.findings.push(...cveFindings)
      const order: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      result.findings.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file))
      const { score, level, recommendation, severityCounts, categoryCounts } = computeScore(
        result.findings,
        result.components,
      )
      result.score = score
      result.level = level
      result.recommendation = recommendation
      result.severityCounts = severityCounts
      result.categoryCounts = categoryCounts
    }

    return NextResponse.json({ ...result, branch: repo.branch, truncated: repo.truncated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan repository."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
