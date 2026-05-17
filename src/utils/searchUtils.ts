/**
 * Normalizes user-entered search text before matching or cache lookup.
 *
 * Removing SQL wildcards prevents broad ILIKE searches, and removing @ lets
 * profile searches treat "@username" the same as "username".
 */
export function normalizeSearchQuery(term: string): string {
  return term.replace(/[%_@]/g, "").trim();
}
