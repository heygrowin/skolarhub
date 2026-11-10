import { 
  collection, 
  doc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Country } from "../types";
import { 
  cleanFirestoreData, 
  fetchCollectionSynced,
  getLocalCache,
  writeDocSynced,
  updateDocSynced,
  deleteDocSynced
} from "../lib/firestoreUtils";

const COLLECTION_NAME = "countries";

export const DEFAULT_COUNTRIES: Country[] = [
  {
    id: "country_IT",
    name: "Italy",
    code: "IT",
    flag: "🇮🇹",
    description: "Public & Private Universities, Medicine in English (IMAT), Engineering & Humanities",
    websiteUrl: "https://skolar.it",
    status: "active",
    defaultCurrency: "EUR",
    settings: {
      requiredDocuments: [
        "Valid Passport",
        "12th Grade Marksheet / High School Diploma",
        "Declaration of Value (DOV) / CIMEA Statement",
        "Pre-enrolment Universitaly Summary",
        "Language Proficiency Certificate (IELTS/TOEFL)",
        "Codice Fiscale"
      ],
      universities: [
        "Università di Bologna",
        "Sapienza Università di Roma",
        "Politecnico di Milano",
        "Università degli Studi di Padova",
        "Università di Milano-Bicocca",
        "Università di Pavia"
      ],
      applicationStages: [
        "New Enquiry",
        "Profile Review",
        "Documents Pending",
        "Universitaly Registration",
        "Application Submitted",
        "Admission Received",
        "Visa Process",
        "Completed"
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "country_MN",
    name: "Mongolia",
    code: "MN",
    flag: "🇲🇳",
    description: "Leading medical degrees in English, MNUMS government medical university, WHO/NMC recognized",
    websiteUrl: "https://skolar.it/mongolia",
    status: "active",
    defaultCurrency: "USD",
    settings: {
      requiredDocuments: [
        "Passport with 2+ Years Validity",
        "NEET Qualification Scorecard",
        "10th & 12th Official Marksheets (PCB 50%+)",
        "Police Clearance Certificate (Apostille)",
        "Medical & Physical Fitness Certificate (HIV/Hepatitis)",
        "Birth Certificate",
        "Bank Financial Solvency Statement"
      ],
      universities: [
        "Mongolian National University of Medical Sciences (MNUMS)",
        "National University of Mongolia",
        "Mongolian University of Science and Technology"
      ],
      applicationStages: [
        "New Enquiry",
        "NEET Eligibility Check",
        "Document Verification",
        "University Entrance Interview",
        "Invitation Letter Issued",
        "Immigration & Visa Processing",
        "Arrival & University Enrollment"
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getCountries(forceRefresh: boolean = false): Promise<Country[]> {
  try {
    const allCountries = await fetchCollectionSynced<Country>(COLLECTION_NAME, {
      forceRemote: forceRefresh,
      seedIfRemoteEmpty: DEFAULT_COUNTRIES,
    });
    allCountries.sort((a, b) => a.name.localeCompare(b.name));
    return allCountries;
  } catch (error) {
    console.error("Error in getCountries:", error);
    const cached = getLocalCache<Country>(COLLECTION_NAME);
    return cached && cached.length > 0 ? cached : DEFAULT_COUNTRIES;
  }
}

export async function getCountryByCode(code: string): Promise<Country | null> {
  const list = await getCountries();
  return list.find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
}

export async function createCountry(countryData: Omit<Country, 'id' | 'createdAt' | 'updatedAt'>): Promise<Country> {
  const customId = `country_${countryData.code.toUpperCase()}`;
  const now = new Date().toISOString();

  const newCountry: Country = {
    ...countryData,
    id: customId,
    code: countryData.code.toUpperCase(),
    createdAt: now,
    updatedAt: now,
  };

  const cleaned = cleanFirestoreData(newCountry);
  return await writeDocSynced(COLLECTION_NAME, customId, cleaned);
}

export async function updateCountry(id: string, updates: Partial<Country>): Promise<void> {
  const now = new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...updates,
    updatedAt: now,
  });

  await updateDocSynced(COLLECTION_NAME, id, cleaned);
}

export async function deleteCountry(id: string): Promise<void> {
  await deleteDocSynced(COLLECTION_NAME, id);
}
