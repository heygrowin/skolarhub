import {
  fetchCollectionSynced,
  getLocalCache,
  writeDocSynced
} from "../lib/firestoreUtils";

export interface CustomOptionGroup {
  id: string; // stored inside customFieldDefinitions as `optgroup_${categoryKey}` so existing security rules apply automatically
  categoryKey: string;
  isOptionGroup: true;
  values: string[];
  updatedAt: string;
}

// Stored in customFieldDefinitions (under `optgroup_` prefix) so Firestore security rules permit read/write out of the box
const COLLECTION_NAME = "customFieldDefinitions";
const DOC_PREFIX = "optgroup_";

/**
 * Loads custom user-created options for a given categoryKey (localStorage + Cloud Firestore synced).
 */
export async function getCustomOptionsForCategory(categoryKey: string): Promise<string[]> {
  try {
    let localValues: string[] = [];
    try {
      const saved = localStorage.getItem(`skolar_custom_options_${categoryKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localValues = parsed;
      }
    } catch {}

    const allDefs = await fetchCollectionSynced<any>(COLLECTION_NAME);
    const matched = allDefs.find((g) => g.id === `${DOC_PREFIX}${categoryKey}`);
    const merged = Array.from(new Set([...(matched?.values || []), ...localValues]));

    try {
      localStorage.setItem(`skolar_custom_options_${categoryKey}`, JSON.stringify(merged));
    } catch {}

    return merged;
  } catch {
    return [];
  }
}

/**
 * Adds a custom option to both localStorage AND Cloud Firestore so it persists across refreshes and devices.
 */
export async function saveCustomOption(categoryKey: string, newValue: string): Promise<string[]> {
  const trimmed = newValue.trim();
  if (!trimmed) return [];

  let localValues: string[] = [];
  try {
    const saved = localStorage.getItem(`skolar_custom_options_${categoryKey}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) localValues = parsed;
    }
  } catch {}

  const docId = `${DOC_PREFIX}${categoryKey}`;
  const cachedAll = getLocalCache<any>(COLLECTION_NAME) || [];
  const existingGroup = cachedAll.find((g) => g.id === docId);

  const merged = Array.from(new Set([...(existingGroup?.values || []), ...localValues, trimmed]));

  try {
    localStorage.setItem(`skolar_custom_options_${categoryKey}`, JSON.stringify(merged));
  } catch {}

  const groupDoc: CustomOptionGroup = {
    id: docId,
    categoryKey,
    isOptionGroup: true,
    values: merged,
    updatedAt: new Date().toISOString(),
  };

  await writeDocSynced(COLLECTION_NAME, docId, groupDoc);
  return merged;
}

/**
 * Removes a custom option from localStorage AND Cloud Firestore.
 */
export async function removeCustomOption(categoryKey: string, optValue: string): Promise<string[]> {
  let localValues: string[] = [];
  try {
    const saved = localStorage.getItem(`skolar_custom_options_${categoryKey}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) localValues = parsed;
    }
  } catch {}

  const docId = `${DOC_PREFIX}${categoryKey}`;
  const cachedAll = getLocalCache<any>(COLLECTION_NAME) || [];
  const existingGroup = cachedAll.find((g) => g.id === docId);

  const merged = Array.from(new Set([...(existingGroup?.values || []), ...localValues])).filter(
    (v) => v !== optValue
  );

  try {
    localStorage.setItem(`skolar_custom_options_${categoryKey}`, JSON.stringify(merged));
  } catch {}

  const groupDoc: CustomOptionGroup = {
    id: docId,
    categoryKey,
    isOptionGroup: true,
    values: merged,
    updatedAt: new Date().toISOString(),
  };

  await writeDocSynced(COLLECTION_NAME, docId, groupDoc);
  return merged;
}
