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
  truncated: boolean
}

const MAX_FILES = 200
const MAX_FILE_BYTES = 400_000

// Extensions / filenames we care about for static analysis.
const TEXT_EXTENSIONS = new Set([
  "py","js","ts","tsx","jsx","sh","bash","rb","go","md","txt","json",
  "yaml","yml","toml","cfg","ini","php","pl","ps1","env","mjs","cjs",
])
const TEXT_FILENAMES = new Set([
  "requirements.txt","SKILL.md","skill.md","Dockerfile","Makefile",
  "package.json","pyproject.toml","setup.py","skill.json","mcp.json",
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

export async function fetchRepo(owner: string, repo: string): Promise<RepoInfo> {
  // 1. Resolve default branch.
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

  const candidates = tree
    .filter((n) => n.type === "blob" && isScannable(n.path) && (n.size ?? 0) <= MAX_FILE_BYTES)
    .slice(0, MAX_FILES)

  const truncated = Boolean(treeData.truncated) || candidates.length < tree.filter((n) => n.type === "blob" && isScannable(n.path)).length

  // 3. Fetch raw contents in parallel (bounded).
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

  return { owner, repo, branch, files, truncated }
}
