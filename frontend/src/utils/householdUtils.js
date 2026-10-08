/**
 * Normalizes a user's household ID to match simulated household IDs in the microgrid (e.g. HH-014).
 *
 * @param {string} rawId - The raw household_id string from user profile (e.g. "HH-014-PROSUMER", "HH-014", "A-204").
 * @param {Array} householdsList - List of simulated household objects from backend API.
 * @returns {string} Normalized household ID (e.g. "HH-014").
 */
export function getNormalizedHouseholdId(rawId, householdsList = []) {
  const defaultFallback = 'HH-014';

  if (!rawId) {
    if (householdsList.some((h) => h.household_id === defaultFallback)) return defaultFallback;
    return householdsList[0]?.household_id || defaultFallback;
  }

  const cleanId = String(rawId).trim();

  // 1. Direct case-insensitive match in households list
  if (householdsList.length > 0) {
    const directMatch = householdsList.find((h) => h.household_id?.toUpperCase() === cleanId.toUpperCase());
    if (directMatch) return directMatch.household_id;
  }

  // 2. Extract digits from string (e.g., "HH-014-PROSUMER" -> 14 -> "HH-014")
  const digitsMatch = cleanId.match(/\d+/);
  if (digitsMatch) {
    const num = parseInt(digitsMatch[0], 10);
    const formattedId = `HH-${String(num).padStart(3, '0')}`;
    if (householdsList.length === 0 || householdsList.some((h) => h.household_id === formattedId)) {
      return formattedId;
    }
  }

  // 3. Fallback: If no match found or non-numeric (e.g., "ADMIN-CTRL"), map to "HH-014" or first available
  if (householdsList.some((h) => h.household_id === defaultFallback)) {
    return defaultFallback;
  }
  return householdsList[0]?.household_id || defaultFallback;
}
