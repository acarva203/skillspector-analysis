import type { RepoMeta } from "./types"

export interface RepoFile {
  path: string
  content: string
  lines: number
}

export interface RepoInfo {
  owner: string
  repo: string
  branch: string
  files: RepoFile[]
  /** Every path in the repo tree (not just scanned files) — used for trust signals. */
  allPaths: string[]
  meta: RepoMeta
  truncated: boolean
}

const MAX_FILES = 200
const MAX_FILE_BYTES = 400_000

// Extensions / filenames we care about for static analysis.
const TEXT_EXTENSIONS = new Set([
  "py","js","ts","tsx","jsx","sh","bash","rb","go","md","txt","json",
  "yaml","yml","toml","cfg","ini","php","pl","ps1","env","mjs","cjs","lock",
])
const TEXT_FILENAMES = new Set([
  "requirements.txt","SKILL.md","skill.md","Dockerfile","Makefile",
  "package.json","pyproject.toml","setup.py","skill.json","mcp.json",
  "package-lock.json","yarn.lock","pnpm-lock.yaml","poetry.lock","go.sum","Gemfile.lock",
])

function getExt(path: string): string {
  const base = path.split("/").pop() ?? ""
  const dot = base.lastIndexOf(".")
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ""
}

function isScannable(path: string): boolean {
  const base = path.split("/").pop() ?? ""
  if (TEXT_FILENAMES.has(base)) return true
  return TEXT_EXTENSIONS.has(getExt(path))
}

export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/$/, "")
  const m = trimmed.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/i)
  if (m) return { owner: m[1], repo: m[2] }
  // bare owner/repo form
  const bare = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (bare) return { owner: bare[1], repo: bare[2] }
  return null
}

function headers(): HeadersInit {
  const h: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "skillspector-web",
  }
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return h
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000))
}

/** Parse a paginated count from the Link header (rel="last" page number). */
function countFromLink(res: Response, fallback: number): { count: number; capped: boolean } {
  const link = res.headers.get("link")
  if (link) {
    const m = link.match(/[?&]page=(\d+)>;\s*rel="last"/)
    if (m) return { count: parseInt(m[1], 10), capped: false }
  }
  return { count: fallback, capped: false }
}

async function safeCount(url: string): Promise<{ count: number; capped: boolean }> {
  try {
    const res = await fetch(url, { headers: headers(), cache: "no-store" })
    if (!res.ok) return { count: 0, capped: true }
    const data = (await res.json()) as unknown[]
    const fallback = Array.isArray(data) ? data.length : 0
    return countFromLink(res, fallback)
  } catch {
    return { count: 0, capped: true }
  }
}

export async function fetchRepo(owner: string, repo: string): Promise<RepoInfo> {
  // 1. Resolve repository metadata.
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: headers(),
    cache: "no-store",
  })
  if (repoRes.status === 404) throw new Error("Repository not found. Make sure it is public and the URL is correct.")
  if (repoRes.status === 403) throw new Error("GitHub API rate limit reached. Try again shortly or set a GITHUB_TOKEN.")
  if (!repoRes.ok) throw new Error(`GitHub API error (${repoRes.status}).`)
  const repoData = await repoRes.json()
  const branch: string = repoData.default_branch ?? "main"

  // 2. Get the full file tree.
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: headers(), cache: "no-store" },
  )
  if (!treeRes.ok) throw new Error(`Could not read repository tree (${treeRes.status}).`)
  const treeData = await treeRes.json()
  const tree: Array<{ path: string; type: string; size?: number }> = treeData.tree ?? []
  const allPaths = tree.filter((n) => n.type === "blob").map((n) => n.path)

  const scannableAll = tree.filter(
    (n) => n.type === "blob" && isScannable(n.path) && (n.size ?? 0) <= MAX_FILE_BYTES,
  )
  const candidates = scannableAll.slice(0, MAX_FILES)
  const truncated = Boolean(treeData.truncated) || candidates.length < scannableAll.length

  // 3. Fetch contributor + release counts in parallel (cheap, paginated).
  const [contrib, releases] = await Promise.all([
    safeCount(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=true`),
    safeCount(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`),
  ])

  // 4. Fetch raw contents in parallel (bounded).
  const files: RepoFile[] = []
  const concurrency = 12
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map(async (node) => {
        const raw = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${node.path}`,
          { headers: { "User-Agent": "skillspector-web" }, cache: "no-store" },
        )
        if (!raw.ok) return null
        const content = await raw.text()
        return { path: node.path, content, lines: content.split("\n").length } as RepoFile
      }),
    )
    for (const r of results) if (r) files.push(r)
  }

  if (files.length === 0) {
    throw new Error("No scannable text files were found in this repository.")
  }

  const meta: RepoMeta = {
    owner,
    repo,
    branch,
    ownerType: repoData.owner?.type ?? "User",
    description: repoData.description ?? null,
    homepage: repoData.homepage || null,
    license: repoData.license?.spdx_id && repoData.license.spdx_id !== "NOASSERTION"
      ? repoData.license.spdx_id
      : repoData.license?.name ?? null,
    stars: repoData.stargazers_count ?? 0,
    forks: repoData.forks_count ?? 0,
    watchers: repoData.subscribers_count ?? repoData.watchers_count ?? 0,
    openIssues: repoData.open_issues_count ?? 0,
    archived: Boolean(repoData.archived),
    ageDays: daysSince(repoData.created_at),
    lastPushDays: daysSince(repoData.pushed_at ?? repoData.updated_at),
    contributors: contrib.count,
    contributorsCapped: contrib.capped,
    releases: releases.count,
    topics: Array.isArray(repoData.topics) ? repoData.topics : [],
  }

  return { owner, repo, branch, files, allPaths, meta, truncated }
}
