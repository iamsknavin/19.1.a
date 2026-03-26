import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { MobileNav } from "./MobileNav";
import { NAV_LINKS } from "@/lib/nav";

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
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-text-primary transition-colors font-mono"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/iamsknavin/19.1.a"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors font-mono text-2xs border border-border px-2 py-1 rounded-sm"
            >
              GitHub ↗
            </a>
            {/* Report incorrect data or send feedback */}
            <a
              href="mailto:naveencsk111@gmail.com?subject=19.1.a%20%E2%80%94%20Data%20Report%20%2F%20Feedback"
              className="font-mono text-2xs border border-accent/40 text-accent px-2 py-1 rounded-sm hover:bg-accent hover:text-bg transition-colors"
              title="Report incorrect data or send feedback"
            >
              Report ✉
            </a>
          </nav>

          {/* Mobile Nav */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
