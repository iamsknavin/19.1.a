/**
 * Human-readable labels for IPC (Indian Penal Code) and BNS (Bharatiya Nyaya Sanhita) sections.
 * Used to make criminal case data meaningful to non-legal users.
 */

const IPC_LABELS: Record<string, string> = {
  // Offences against the State
  "121": "Waging War Against India",
  "124a": "Sedition",
  "120b": "Criminal Conspiracy",

  // Offences against body
  "302": "Murder",
  "304": "Culpable Homicide",
  "304a": "Death by Negligence",
  "304b": "Dowry Death",
  "307": "Attempt to Murder",
  "308": "Attempt to Culpable Homicide",
  "323": "Voluntarily Causing Hurt",
  "324": "Voluntarily Causing Hurt with Weapon",
  "325": "Grievous Hurt",
  "326": "Grievous Hurt with Weapon",
  "341": "Wrongful Restraint",
  "342": "Wrongful Confinement",
  "354": "Assault on Woman",
  "354a": "Sexual Harassment",
  "376": "Rape",
  "376a": "Rape Causing Death",
  "376d": "Gang Rape",

  // Kidnapping & Abduction
  "363": "Kidnapping",
  "364": "Kidnapping for Ransom",
  "364a": "Kidnapping for Murder",
  "365": "Kidnapping to Confine",
  "366": "Kidnapping / Abduction of Woman",
  "366a": "Procuration of Minor Girl",
  "369": "Kidnapping Child Under 10",

  // Property offences
  "379": "Theft",
  "380": "Theft in Dwelling",
  "384": "Extortion",
  "385": "Putting in Fear for Extortion",
  "392": "Robbery",
  "395": "Dacoity",
  "396": "Dacoity with Murder",
  "397": "Robbery / Dacoity with Attempt to Kill",
  "406": "Criminal Breach of Trust",
  "409": "CBT by Public Servant",
  "411": "Receiving Stolen Property",
  "420": "Cheating / Fraud",
  "447": "Criminal Trespass",
  "448": "House Trespass",
  "452": "House Trespass with Assault",
  "457": "Lurking / House-breaking by Night",

  // Forgery & counterfeiting
  "465": "Forgery",
  "467": "Forgery of Valuable Security",
  "468": "Forgery for Cheating",
  "471": "Using Forged Document",

  // Rioting
  "143": "Unlawful Assembly",
  "147": "Rioting",
  "148": "Rioting with Deadly Weapon",
  "149": "Every Member of Unlawful Assembly Guilty",
  "153a": "Promoting Enmity Between Groups",

  // Criminal intimidation
  "504": "Intentional Insult to Provoke Breach of Peace",
  "506": "Criminal Intimidation",
  "507": "Criminal Intimidation by Anonymous Communication",

  // Defamation
  "499": "Defamation",
  "500": "Punishment for Defamation",

  // Prevention of Corruption Act
  "7": "Public Servant Taking Bribe (PCA)",
  "7a": "Taking Undue Advantage (PCA)",
  "8": "Bribe-taking by Commercial Org (PCA)",
  "13": "Criminal Misconduct by Public Servant (PCA)",
  "14": "Habitual Offender (PCA)",

  // SC/ST Act
  "3": "Offence Against SC/ST (PoA Act)",

  // Arms Act
  "25": "Possession of Illegal Arms (Arms Act)",
  "27": "Using Arms (Arms Act)",

  // Other common sections
  "34": "Common Intention",
  "109": "Abetment",
  "114": "Abettor Present When Offence Committed",
  "186": "Obstructing Public Servant",
  "188": "Disobeying Public Servant's Order",
  "294": "Obscene Acts / Songs",
  "295a": "Outraging Religious Feelings",
  "298": "Uttering Words to Wound Religious Feelings",
  "332": "Voluntarily Causing Hurt to Public Servant",
  "353": "Assault on Public Servant",
  "505": "Statements Conducing to Public Mischief",
  "509": "Word / Gesture to Insult Modesty of Woman",
};

/**
 * Get a human-readable label for an IPC section number.
 */
export function getIPCLabel(section: string): string {
  const normalized = section.toLowerCase().trim().replace(/^0+/, "");
  return IPC_LABELS[normalized] ?? `IPC ${section}`;
}

/**
 * Get human-readable crime names for a list of IPC sections.
 * Deduplicates and returns unique crime names.
 */
export function getCrimeNames(ipcSections: string[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const section of ipcSections) {
    const normalized = section.toLowerCase().trim().replace(/^0+/, "");
    // Only include sections that have known labels (skip unmapped generic sections)
    if (!(normalized in IPC_LABELS)) continue;
    const label = IPC_LABELS[normalized];
    if (!seen.has(label)) {
      seen.add(label);
      names.push(label);
    }
  }

  return names;
}

/** Heinous IPC sections mapped to their specific crime type */
const HEINOUS_CRIME_MAP: Record<string, string> = {
  "302": "Murder",
  "304": "Culpable Homicide",
  "307": "Attempt to Murder",
  "376": "Rape",
  "363": "Kidnapping",
  "364": "Kidnapping for Ransom",
  "364a": "Kidnapping for Murder",
  "365": "Kidnapping",
  "366": "Abduction of Woman",
  "420": "Financial Fraud",
  "406": "Criminal Breach of Trust",
  "409": "CBT by Public Servant",
  "13": "Corruption (PCA)",
  "7": "Bribery (PCA)",
  "120b": "Criminal Conspiracy",
  "121": "Waging War Against India",
  "124a": "Sedition",
};

/**
 * Get the specific heinous crime types from IPC sections.
 * Returns array of specific crime names (e.g., ["Murder", "Attempt to Murder"]).
 * Returns empty array if no heinous sections found.
 */
export function getHeinousCrimeTypes(ipcSections: string[]): string[] {
  const crimes = new Set<string>();

  for (const section of ipcSections) {
    const normalized = section.toLowerCase().trim().replace(/^0+/, "");
    const crime = HEINOUS_CRIME_MAP[normalized];
    if (crime) {
      crimes.add(crime);
    }
  }

  return Array.from(crimes);
}

/**
 * Get a user-friendly status label and description.
 */
export function getStatusLabel(status: string | null): {
  label: string;
  description: string;
} {
  switch (status) {
    case "pending":
      return { label: "Trial Pending", description: "Case is under trial" };
    case "convicted":
      return { label: "Convicted", description: "Found guilty by court" };
    case "acquitted":
      return {
        label: "Acquitted",
        description: "Cleared of charges by court",
      };
    case "discharged":
      return {
        label: "Discharged",
        description: "Case dropped before trial",
      };
    case "stayed":
      return {
        label: "Stayed",
        description: "Proceedings paused by higher court",
      };
    case "disposed":
      return { label: "Disposed", description: "Case concluded" };
    default:
      return {
        label: "Status Not Available",
        description: "Case status not reported in affidavit",
      };
  }
}
