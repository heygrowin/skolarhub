import { 
  collection, 
  getDocs, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { CustomFieldDefinition } from "../types";
import { 
  cleanFirestoreData, 
  getLocalCache, 
  setLocalCache, 
  addToLocalCache, 
  updateInLocalCache,
  removeFromLocalCache,
  syncDocToFirestore,
  syncDocDeleteFromFirestore,
  withTimeout
} from "../lib/firestoreUtils";

const COLLECTION_NAME = "customFieldDefinitions";

export const DEFAULT_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  // Italy specific
  {
    id: "cf_def_1",
    fieldName: "Codice Fiscale",
    key: "codiceFiscale",
    description: "Italian Tax Identification Code (16 alphanumeric characters)",
    fieldType: "text",
    required: false,
    countryCode: "IT",
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "cf_def_2",
    fieldName: "Universitaly Application ID",
    key: "universitalyAppId",
    description: "Pre-enrollment registration code on Universitaly portal",
    fieldType: "text",
    required: false,
    countryCode: "IT",
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "cf_def_3",
    fieldName: "Residence Permit (Permesso di Soggiorno)",
    key: "residencePermitStatus",
    description: "Status of initial Italian residence permit kit submission",
    fieldType: "dropdown",
    required: false,
    options: ["Not Applicable", "Kit Pending", "Postal Kit Sent", "Questura Appointment Scheduled", "Permit Issued"],
    countryCode: "IT",
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // Mongolia specific
  {
    id: "cf_def_4",
    fieldName: "NEET Roll Number",
    key: "neetRollNumber",
    description: "Indian National Eligibility cum Entrance Test Roll No",
    fieldType: "text",
    required: false,
    countryCode: "MN",
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "cf_def_5",
    fieldName: "NEET Percentile Score",
    key: "neetPercentile",
    description: "Candidate overall NEET percentile",
    fieldType: "number",
    required: false,
    countryCode: "MN",
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "cf_def_6",
    fieldName: "MNUMS Student Portal ID",
    key: "mnumsPortalId",
    description: "Official registration ID for Mongolian National University of Medical Sciences",
    fieldType: "text",
    required: false,
    countryCode: "MN",
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // Global fields
  {
    id: "cf_def_7",
    fieldName: "Emergency Contact Person & Phone",
    key: "emergencyContact",
    description: "Parent or local guardian name and phone number",
    fieldType: "text",
    required: true,
    countryCode: "*",
    displayOrder: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getCustomFields(countryCode?: string): Promise<CustomFieldDefinition[]> {
  try {
    let allFields: CustomFieldDefinition[] = [];
    const cached = getLocalCache<CustomFieldDefinition>(COLLECTION_NAME);
    if (cached !== null && cached.length > 0) {
      allFields = [...cached];
    } else {
      try {
        const colRef = collection(db, COLLECTION_NAME);
        const snapshot = await withTimeout(getDocs(colRef), 1200);
        if (!snapshot.empty) {
          allFields = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomFieldDefinition));
        } else {
          allFields = [...DEFAULT_CUSTOM_FIELDS];
        }
        setLocalCache(COLLECTION_NAME, allFields);
      } catch (e) {
        allFields = [...DEFAULT_CUSTOM_FIELDS];
        setLocalCache(COLLECTION_NAME, allFields);
      }
    }

    allFields.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    if (countryCode && countryCode !== 'ALL') {
      return allFields.filter(f => f.countryCode === '*' || f.countryCode === countryCode);
    }

    return allFields;
  } catch (error) {
    console.error("Error in getCustomFields:", error);
    const cached = getLocalCache<CustomFieldDefinition>(COLLECTION_NAME);
    return cached && cached.length > 0 ? cached : DEFAULT_CUSTOM_FIELDS;
  }
}

export async function createCustomField(
  fieldData: Omit<CustomFieldDefinition, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomFieldDefinition> {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = doc(colRef);
  const now = new Date().toISOString();

  const newField: CustomFieldDefinition = {
    ...fieldData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const cleaned = cleanFirestoreData(newField);

  addToLocalCache(COLLECTION_NAME, cleaned);
  syncDocToFirestore(COLLECTION_NAME, docRef.id, cleaned);

  return cleaned;
}

export async function updateCustomField(
  id: string,
  updates: Partial<CustomFieldDefinition>
): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  updateInLocalCache(COLLECTION_NAME, id, cleaned);
  syncDocToFirestore(COLLECTION_NAME, id, cleaned);
}

export async function deleteCustomField(id: string): Promise<void> {
  removeFromLocalCache(COLLECTION_NAME, id);
  syncDocDeleteFromFirestore(COLLECTION_NAME, id);
}
