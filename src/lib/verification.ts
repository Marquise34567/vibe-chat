/**
 * Age gate — 16+ only. Stored in localStorage after confirmation.
 * Also tracks scholar verification status.
 */

const AGE_KEY = "ff:age_verified";
const SCHOLAR_KEY = "ff:scholar_verified";
const SCHOLAR_EMAIL_KEY = "ff:scholar_email";

export const getAgeVerified = (): boolean => {
  try { return localStorage.getItem(AGE_KEY) === "true"; } catch { return false; }
};
export const setAgeVerified = () => {
  try { localStorage.setItem(AGE_KEY, "true"); } catch { /* ignore */ }
};

export const getScholarVerified = (): boolean => {
  try { return localStorage.getItem(SCHOLAR_KEY) === "true"; } catch { return false; }
};
export const getScholarEmail = (): string | null => {
  try { return localStorage.getItem(SCHOLAR_EMAIL_KEY); } catch { return null; }
};
export const setScholarVerified = (email: string) => {
  try {
    localStorage.setItem(SCHOLAR_KEY, "true");
    localStorage.setItem(SCHOLAR_EMAIL_KEY, email);
  } catch { /* ignore */ }
};
export const clearScholarVerified = () => {
  try {
    localStorage.removeItem(SCHOLAR_KEY);
    localStorage.removeItem(SCHOLAR_EMAIL_KEY);
  } catch { /* ignore */ }
};

/** Check if an email looks like a student/scholar email (.edu, scholar, university domains) */
export const isScholarEmail = (email: string): boolean => {
  const lower = email.toLowerCase().trim();
  const scholarDomains = [".edu", ".edu.", ".ac.", "student.", "scholar.", "university.", "college."];
  // Check TLD patterns
  if (lower.endsWith(".edu")) return true;
  if (lower.includes(".edu.")) return true;
  if (lower.match(/\.ac\.[a-z]{2,}$/)) return true; // .ac.uk, .ac.jp, etc.
  if (lower.match(/\.edu\.[a-z]{2,}$/)) return true; // .edu.au, .edu.sg, etc.
  // Common student email providers
  if (lower.endsWith("@stanford.edu")) return true;
  if (lower.endsWith("@mit.edu")) return true;
  return scholarDomains.some((d) => lower.includes(d));
};
