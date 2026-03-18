import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
          {/* Brand */}
          <div>
            <p className="font-mono text-accent font-semibold mb-1">
              <span className="font-bold">19</span>
              <span className="text-text-muted">.</span>
              <span className="font-bold">1</span>
              <span className="text-text-muted">.</span>
              <span className="font-bold">a</span>
            </p>
            <p className="text-text-secondary text-xs leading-relaxed">
              Your right to know. Every rupee. Every case. Every vote.
            </p>
            <p className="text-text-muted text-2xs mt-2 italic leading-relaxed">
              &ldquo;All citizens shall have the right to freedom of speech and expression.&rdquo;
              <br />
              <span className="not-italic">— Article 19(1)(a), Constitution of India</span>
            </p>
            <p className="text-text-muted text-2xs mt-3">
              All data sourced from mandatory public disclosures. 19.1.a does not make
              allegations — we present public records.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-mono text-text-secondary text-2xs uppercase tracking-widest mb-3">
              Platform
            </p>
            <ul className="space-y-2 text-text-secondary text-xs">
              <li>
                <Link href="/politicians" className="hover:text-text-primary transition-colors">
                  Browse MPs
                </Link>
              </li>
              <li>
                <Link href="/parties" className="hover:text-text-primary transition-colors">
                  Parties
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/data-sources" className="hover:text-text-primary transition-colors">
                  Data Sources
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className="hover:text-text-primary transition-colors">
                  API Docs
                </Link>
              </li>
            </ul>
          </div>

          {/* Sources */}
          <div>
            <p className="font-mono text-text-secondary text-2xs uppercase tracking-widest mb-3">
              Data Sources
            </p>
            <ul className="space-y-2 text-text-secondary text-xs">
              <li>
                <a
                  href="https://www.myneta.info"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-primary transition-colors"
                >
                  MyNeta / ADR ↗
                </a>
              </li>
              <li>
                <a
                  href="https://affidavit.eci.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-primary transition-colors"
                >
                  ECI ↗
                </a>
              </li>
              <li>
                <a
                  href="https://prsindia.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-primary transition-colors"
                >
                  PRS India ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <p className="text-text-muted text-2xs font-mono">
            MIT License · Open Source
          </p>
          <p className="text-text-muted text-2xs font-mono">
            Not affiliated with the Government of India
          </p>
        </div>
      </div>
    </footer>
  );
}
