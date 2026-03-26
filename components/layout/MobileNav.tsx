"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { NAV_LINKS } from "@/lib/nav";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => setIsOpen(false), []);

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, close]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col justify-center items-center w-10 h-10 gap-1.5"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        <span
          className={`block w-5 h-0.5 bg-text-primary transition-all duration-200 ${
            isOpen ? "rotate-45 translate-y-2" : ""
          }`}
        />
        <span
          className={`block w-5 h-0.5 bg-text-primary transition-all duration-200 ${
            isOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block w-5 h-0.5 bg-text-primary transition-all duration-200 ${
            isOpen ? "-rotate-45 -translate-y-2" : ""
          }`}
        />
      </button>

      {/* Overlay + Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-bg/80 z-40 animate-fade-in"
            onClick={close}
          />

          {/* Slide-out panel */}
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-surface border-l border-border z-50 animate-slide-in-right flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-mono text-sm text-text-primary">
                <span className="text-accent font-bold">19</span>
                <span className="text-text-muted">.</span>
                <span className="text-accent font-bold">1</span>
                <span className="text-text-muted">.</span>
                <span className="text-accent font-bold">a</span>
              </span>
              <button
                onClick={close}
                className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border">
              <SearchBar compact />
            </div>

            {/* Nav links */}
            <nav className="flex-1 p-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block font-mono text-sm py-3 px-3 rounded-sm transition-colors ${
                    pathname === link.href
                      ? "text-accent bg-accent/10 border border-accent/30"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="https://github.com/iamsknavin/19.1.a"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-mono text-sm py-3 px-3 rounded-sm text-text-secondary hover:text-accent hover:bg-surface-2 transition-colors"
              >
                GitHub ↗
              </a>
            </nav>

            {/* Footer — report link + tagline */}
            <div className="p-4 border-t border-border space-y-3">
              <a
                href="mailto:naveencsk111@gmail.com?subject=19.1.a%20%E2%80%94%20Data%20Report%20%2F%20Feedback"
                className="flex items-center gap-2 font-mono text-xs text-accent border border-accent/30 px-3 py-2 rounded-sm hover:bg-accent/10 transition-colors"
              >
                <span>✉</span>
                <span>Report incorrect data / Feedback</span>
              </a>
              <p className="font-mono text-2xs text-text-muted">
                Your right to know.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
