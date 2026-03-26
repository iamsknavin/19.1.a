/** Shared navigation link definitions used by Header, Footer, and MobileNav. */
export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/politicians", label: "Browse" },
  { href: "/parties", label: "Parties" },
  { href: "/about", label: "About" },
  { href: "/data-sources", label: "Data" },
  { href: "/api-docs", label: "API" },
];
