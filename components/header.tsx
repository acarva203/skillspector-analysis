import Link from "next/link"
import { Shield } from "lucide-react"

export function Header({ activePath }: { activePath?: string }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
            SkillSpector
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/learn"
            className={`text-xs transition-colors hover:text-foreground ${
              activePath === "/learn" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Learn
          </Link>
          <a
            href="https://github.com/NVIDIA/SkillSpector"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Engine by NVIDIA ↗
          </a>
        </nav>
      </div>
    </header>
  )
}
