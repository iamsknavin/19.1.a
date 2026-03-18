import type { Metadata } from "next";
import Link from "next/link";
import { DATA_SOURCES } from "@/lib/config";

export const metadata: Metadata = { title: "About 19.1.a" };

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Article 19(1)(a) quote block */}
      <div className="border-l-2 border-accent bg-accent/5 px-6 py-5 mb-10 rounded-r-sm">
        <p className="font-mono text-accent text-xs uppercase tracking-widest mb-2">
          Article 19(1)(a) — Constitution of India
        </p>
        <p className="text-text-primary text-lg italic leading-relaxed">
          &ldquo;All citizens shall have the right to freedom of speech and expression.&rdquo;
        </p>
      </div>

      <div className="mb-10">
        <p className="font-mono text-accent text-xs uppercase tracking-widest mb-3">
          About
        </p>
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          What is 19.1.a?
        </h1>
        <p className="text-text-secondary leading-relaxed">
          19.1.a is an open-source platform that makes Indian politician
          public disclosures accessible, searchable, and understandable. Named
          after the constitutional right to free expression, we aggregate data
          from mandatory government sources and present it in a clear,
          consistent format — because transparency is a fundamental right.
        </p>
        <p className="text-text-secondary leading-relaxed mt-3 text-sm">
          The Supreme Court of India has held that Article 19(1)(a) includes
          the citizen&apos;s <strong className="text-text-primary">right to information</strong> —
          making it the constitutional foundation of India&apos;s transparency
          framework, including the RTI Act of 2005.
          <span className="text-text-muted italic block mt-1 text-xs">
            S.P. Gupta v. Union of India (1981) · State of U.P. v. Raj Narain (1975)
          </span>
        </p>
      </div>

      <section className="mb-10 space-y-4">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest">
          The Problem
        </h2>
        <p className="text-text-secondary leading-relaxed text-sm">
          Indian politicians are required by law to disclose their assets,
          liabilities, and criminal cases before every election. This data
          exists — but it&apos;s buried in thousands of PDF affidavits across
          multiple government portals, formatted inconsistently, and nearly
          impossible to search or compare.
        </p>
        <p className="text-text-secondary leading-relaxed text-sm">
          19.1.a solves this by scraping, parsing, and presenting the same
          public data in a fast, searchable interface.
        </p>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest">
          What We Track
        </h2>
        <ul className="space-y-2 text-sm text-text-secondary">
          {[
            "Lok Sabha MPs (545 constituencies)",
            "State MLAs (Vidhan Sabha elections)",
            "Asset declarations from ECI affidavits",
            "Criminal case disclosures with IPC sections",
            "Party affiliation and election history",
            "Parliamentary attendance (PRS India)",
            "Corruption risk signals (automated)",
            "News controversy tracking",
            "eCourts live case status",
            "MPLAD fund utilization",
            "Public REST API for researchers and journalists",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-accent font-mono mt-0.5">›</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest">
          Coming Next
        </h2>
        <div className="bg-surface border border-border rounded-sm p-4">
          <ul className="space-y-1.5 text-xs text-text-secondary">
            {[
              "Company ownership & directorship tracking (MCA21)",
              "Government tender conflict-of-interest detection (GeM)",
              "Rajya Sabha member data (via Sansad.in)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="text-text-muted mt-0.5">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest">
          Methodology
        </h2>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <strong className="text-text-primary">Net Worth</strong> = Total Assets − Total Liabilities, as declared in the ECI statutory affidavit filed before each election.
          </p>
          <p>
            <strong className="text-text-primary">Criminal Cases</strong> are self-declared by candidates in their affidavits. We display what politicians themselves disclose — including IPC section numbers and court names.
          </p>
          <p>
            <strong className="text-text-primary">Heinous Offences</strong> are cases involving IPC sections related to murder (302), rape (376), kidnapping (363–366), or financial fraud exceeding ₹1 crore.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
          Data Sources
        </h2>
        <div className="space-y-2">
          {Object.values(DATA_SOURCES).map((src) => (
            <a
              key={src.url}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-surface border border-border hover:border-accent/40 transition-colors p-3 rounded-sm group"
            >
              <div>
                <p className="font-mono text-sm text-text-primary group-hover:text-accent transition-colors">
                  {src.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{src.description}</p>
              </div>
              <span className="text-text-muted font-mono text-xs shrink-0 ml-4">↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="mb-10 bg-surface border border-border rounded-sm p-6">
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-3">
          Disclaimer
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          All data on 19.1.a is sourced from mandatory public disclosures
          made by politicians themselves. 19.1.a does not make allegations —
          we present public records. For corrections or disputes, please file
          an issue on our GitHub repository.
        </p>
        <p className="text-sm text-text-secondary leading-relaxed mt-3">
          19.1.a is not affiliated with the Government of India, the
          Election Commission of India, or any political party.
        </p>
      </section>

      <section>
        <h2 className="font-mono text-text-secondary text-xs uppercase tracking-widest mb-4">
          Open Source
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          19.1.a is MIT licensed and open source. Contributions welcome.
        </p>
        <div className="flex gap-3">
          <a
            href="https://github.com/iamsknavin/19.1.a"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm border border-accent text-accent px-4 py-2 hover:bg-accent hover:text-bg transition-colors"
          >
            GitHub →
          </a>
          <Link
            href="/data-sources"
            className="font-mono text-sm border border-border text-text-secondary px-4 py-2 hover:border-text-secondary transition-colors"
          >
            Data Sources
          </Link>
        </div>
      </section>
    </div>
  );
}
