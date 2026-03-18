import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { MobileNav } from "./MobileNav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group"
          >
            <span className="font-mono text-lg tracking-tight group-hover:opacity-80 transition-opacity">
              <span className="text-accent font-bold">19</span>
              <span className="text-text-muted">.</span>
              <span className="text-accent font-bold">1</span>
              <span className="text-text-muted">.</span>
              <span className="text-accent font-bold">a</span>
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xl hidden sm:block">
            <SearchBar compact />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
            <Link
              href="/politicians"
              className="hover:text-text-primary transition-colors font-mono"
            >
              Browse
            </Link>
            <Link
              href="/parties"
              className="hover:text-text-primary transition-colors font-mono"
            >
              Parties
            </Link>
            <Link
              href="/about"
              className="hover:text-text-primary transition-colors font-mono"
            >
              About
            </Link>
            <Link
              href="/data-sources"
              className="hover:text-text-primary transition-colors font-mono"
            >
              Data
            </Link>
            <Link
              href="/api-docs"
              className="hover:text-text-primary transition-colors font-mono"
            >
              API
            </Link>
            <a
              href="https://github.com/iamsknavin/19.1.a"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors font-mono text-2xs border border-border px-2 py-1 rounded-sm"
            >
              GitHub ↗
            </a>
          </nav>

          {/* Mobile Nav */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
