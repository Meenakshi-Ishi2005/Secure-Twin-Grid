/**
 * Normalizes a user's household ID to deterministically and stably match
 * simulated household IDs in the microgrid fleet (e.g. HH-001 through HH-100).
 *
 * @param {string|null|undefined} rawId - The raw household_id string or unit from user profile (e.g. "HH-014", "HH-004", "HH-BUILDING-A---A-204", "A-204").
 * @param {Array} [householdsList=[]] - List of simulated household objects from backend API.
 * @returns {string} Normalized household ID (e.g. "HH-004", "HH-014").
 */
export function getNormalizedHouseholdId(rawId, householdsList = []) {
  if (!rawId) {
    const solarHh = householdsList.find((h) => h.has_solar);
    return solarHh?.household_id || householdsList[0]?.household_id || 'HH-002';
  }

  const cleanId = String(rawId).trim();
  if (!cleanId) {
    const solarHh = householdsList.find((h) => h.has_solar);
    return solarHh?.household_id || householdsList[0]?.household_id || 'HH-002';
  }

  // Determine available fleet size (default 100 households)
  const fleetSize = householdsList.length > 0 ? householdsList.length : 100;

  // 1. Direct case-insensitive match in households list
  if (householdsList.length > 0) {
    const directMatch = householdsList.find(
      (h) => h.household_id && h.household_id.toUpperCase() === cleanId.toUpperCase()
    );
    if (directMatch) return directMatch.household_id;
  }

  // 2. Extract digits from string (e.g. "HH-014", "A-204", "HH-BUILDING-A---A-206", "14")
  const digitsMatch = cleanId.match(/\d+/);
  if (digitsMatch) {
    const num = parseInt(digitsMatch[0], 10);
    if (num > 0) {
      // If within fleet range and directly present in householdsList (or fleet list not yet loaded)
      if (num <= fleetSize) {
        const directFormatted = `HH-${String(num).padStart(3, '0')}`;
        if (
          householdsList.length === 0 ||
          householdsList.some((h) => h.household_id === directFormatted)
        ) {
          return directFormatted;
        }
      }

      // If num > fleetSize (e.g. apartment 204, 206), map deterministically into [1..fleetSize]
      const mappedNum = ((num - 1) % fleetSize) + 1;
      const mappedId = `HH-${String(mappedNum).padStart(3, '0')}`;
      if (
        householdsList.length === 0 ||
        householdsList.some((h) => h.household_id === mappedId)
      ) {
        return mappedId;
      }
    }
  }

  // 3. Fallback for non-numeric identifiers (e.g., "ADMIN-CTRL", "green_valley"):
  // Compute deterministic string hash mapped to [1..fleetSize]
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = (hash << 5) - hash + cleanId.charCodeAt(i);
    hash |= 0;
  }
  const stableNum = (Math.abs(hash) % fleetSize) + 1;
  const stableId = `HH-${String(stableNum).padStart(3, '0')}`;

  if (
    householdsList.length === 0 ||
    householdsList.some((h) => h.household_id === stableId)
  ) {
    return stableId;
  }

  return householdsList[0]?.household_id || 'HH-001';
}

