import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase";
import {
  Country,
  CustomFieldDefinition,
  Partner,
  Student,
  Application,
  Invoice,
  Payment,
  Expense,
  DocumentRecord
} from "../types";
import {
  cleanFirestoreData,
  getLocalCache,
  setLocalCache,
  withTimeout
} from "./firestoreUtils";

export interface SeedResult {
  success: boolean;
  message: string;
  totalRecords: number;
}

// 1. Initial Countries: Italy and Mongolia
export const SEED_COUNTRIES: Country[] = [
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

// 2. Custom Field Definitions
export const SEED_CUSTOM_FIELDS: CustomFieldDefinition[] = [
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

// 3. Demo Partners (B2B)
export const SEED_PARTNERS: Partner[] = [
  {
    id: "partner_harshit",
    name: "Harshit / EduVlog",
    partnerType: "Content Creator",
    contactPerson: "Harshit Sharma",
    email: "harshit@eduvlog.demo",
    phone: "+91 98765 43210",
    company: "EduVlog Media",
    country: "India",
    commissionType: "percentage",
    commissionRate: 15,
    currency: "EUR",
    status: "active",
    notes: "Major YouTube content creator covering study abroad in Europe & medical education.",
    agreementDetails: "15% of net consultancy fee upon successful admission confirmation.",
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "partner_apex",
    name: "Apex Global Overseas",
    partnerType: "Education Agent",
    contactPerson: "Rajesh Malhotra",
    email: "contact@apexoverseas.demo",
    phone: "+91 91234 56789",
    company: "Apex Global Education Consultants",
    country: "India",
    commissionType: "fixed",
    commissionRate: 500,
    currency: "USD",
    status: "active",
    notes: "Regional agency sending MBBS applicants to Mongolia and Europe.",
    agreementDetails: "Fixed $500 per enrolled student paid within 30 days of university arrival.",
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 4. Demo Students
export const SEED_STUDENTS: Student[] = [
  {
    id: "student_demo_1",
    fullName: "Matteo Rossi",
    email: "matteo.rossi@example.demo",
    phone: "+39 340 1234567",
    dateOfBirth: "2004-05-14",
    nationality: "Italian",
    address: "Via Roma 42, Milan, Italy",
    passportNumber: "YA9876543",
    passportExpiry: "2032-08-10",
    previousEducation: "Liceo Scientifico",
    schoolOrUniversity: "Liceo Leonardo da Vinci",
    academicMarks: "92/100",
    acquisitionType: "B2C",
    countryOfInterest: "IT",
    leadSource: "skolar.it Website Form",
    registrationDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    notes: "Interested in MSc Computer Engineering at Politecnico di Milano. Has English C1 certification.",
    customFields: {
      codiceFiscale: "RSSMTT04E14F205Z",
      universitalyAppId: "UNIV-2026-IT-9021",
      emergencyContact: "Giuseppe Rossi (+39 340 7654321)"
    },
    isDemo: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "student_demo_2",
    fullName: "Aarav Patel",
    email: "aarav.patel@example.demo",
    phone: "+91 98220 11223",
    dateOfBirth: "2005-11-20",
    nationality: "Indian",
    address: "Sector 14, Ahmedabad, Gujarat, India",
    passportNumber: "Z5123489",
    passportExpiry: "2033-02-15",
    previousEducation: "Senior Secondary (12th Grade Science PCB)",
    schoolOrUniversity: "Delhi Public School",
    academicMarks: "88%",
    neetScore: "542",
    neetQualified: true,
    acquisitionType: "B2B",
    partnerId: "partner_harshit",
    partnerName: "Harshit / EduVlog",
    countryOfInterest: "MN",
    leadSource: "Partner Referral (Harshit)",
    registrationDate: new Date(Date.now() - 20 * 86400000).toISOString(),
    notes: "Targeting MBBS at MNUMS Mongolia. NEET qualified with 542 score. Documents verified.",
    customFields: {
      neetRollNumber: "2401098451",
      neetPercentile: 94.8,
      mnumsPortalId: "MNUMS-MED-2026-44",
      emergencyContact: "Dr. Ramesh Patel (+91 98220 00112)"
    },
    isDemo: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "student_demo_3",
    fullName: "Priya Sharma",
    email: "priya.sharma@example.demo",
    phone: "+91 99112 33445",
    dateOfBirth: "2003-09-02",
    nationality: "Indian",
    address: "South Extension Part II, New Delhi, India",
    passportNumber: "R7892341",
    passportExpiry: "2031-10-30",
    previousEducation: "High School (12th Grade)",
    schoolOrUniversity: "Modern School Barakhamba",
    academicMarks: "94.5%",
    neetScore: "580",
    neetQualified: true,
    acquisitionType: "B2B",
    partnerId: "partner_apex",
    partnerName: "Apex Global Overseas",
    countryOfInterest: "IT",
    leadSource: "Agent Partner (Apex)",
    registrationDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    notes: "Applying for IMAT (Single-cycle Medicine) in English at Sapienza University of Rome.",
    customFields: {
      codiceFiscale: "SHRPYA03P42Z222X",
      universitalyAppId: "UNIV-2026-IT-1194",
      residencePermitStatus: "Not Applicable",
      emergencyContact: "Sunita Sharma (+91 99112 33440)"
    },
    isDemo: true,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 5. Demo Applications
export const SEED_APPLICATIONS: Application[] = [
  {
    id: "app_demo_1",
    studentId: "student_demo_1",
    studentName: "Matteo Rossi",
    countryId: "country_IT",
    countryCode: "IT",
    countryName: "Italy",
    university: "Politecnico di Milano",
    course: "MSc Computer Engineering",
    intake: "Fall 2026",
    status: "Admission Received",
    notes: "Conditional offer received. Preparing final graduation documents for enrolment.",
    statusHistory: [
      {
        id: "hist_1",
        status: "New Enquiry",
        changedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        changedBy: "system",
        changedByName: "Lead Integration",
        note: "Inquiry generated from skolar.it"
      },
      {
        id: "hist_2",
        status: "Application Submitted",
        changedAt: new Date(Date.now() - 18 * 86400000).toISOString(),
        changedBy: "staff_1",
        changedByName: "Elena Counsellor",
        note: "Submitted through Polimi portal"
      },
      {
        id: "hist_3",
        status: "Admission Received",
        changedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        changedBy: "staff_1",
        changedByName: "Elena Counsellor",
        note: "Official acceptance letter issued"
      }
    ],
    isDemo: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "app_demo_2",
    studentId: "student_demo_2",
    studentName: "Aarav Patel",
    countryId: "country_MN",
    countryCode: "MN",
    countryName: "Mongolia",
    university: "Mongolian National University of Medical Sciences (MNUMS)",
    course: "MBBS / General Medicine (English Medium)",
    intake: "Fall 2026",
    status: "Visa Process",
    notes: "Invitation letter received from Ministry of Foreign Affairs Mongolia. Visa appointment booked.",
    statusHistory: [
      {
        id: "hist_4",
        status: "New Enquiry",
        changedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        changedBy: "partner_harshit",
        changedByName: "Harshit / EduVlog",
        note: "Referred by EduVlog channel"
      },
      {
        id: "hist_5",
        status: "Admission Received",
        changedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        changedBy: "staff_admin",
        changedByName: "SKOLAR Admin",
        note: "MNUMS Dean admission confirmed"
      },
      {
        id: "hist_6",
        status: "Visa Process",
        changedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        changedBy: "staff_admin",
        changedByName: "SKOLAR Admin",
        note: "Visa file lodged at Mongolian Embassy"
      }
    ],
    isDemo: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "app_demo_3",
    studentId: "student_demo_3",
    studentName: "Priya Sharma",
    countryId: "country_IT",
    countryCode: "IT",
    countryName: "Italy",
    university: "Sapienza Università di Roma",
    course: "Single-Cycle Medicine & Surgery (English IMAT)",
    intake: "Fall 2026",
    status: "Application Preparation",
    notes: "CIMEA verification in progress. IMAT test registration scheduled.",
    statusHistory: [
      {
        id: "hist_7",
        status: "New Enquiry",
        changedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        changedBy: "partner_apex",
        changedByName: "Apex Global Overseas",
        note: "Agent onboarding"
      },
      {
        id: "hist_8",
        status: "Application Preparation",
        changedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        changedBy: "staff_1",
        changedByName: "Elena Counsellor",
        note: "Compiling 12th certificates for CIMEA statement"
      }
    ],
    isDemo: true,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 6. Demo Invoices
export const SEED_INVOICES: Invoice[] = [
  {
    id: "inv_demo_1",
    invoiceNumber: "INV-2026-IT-001",
    studentId: "student_demo_1",
    studentName: "Matteo Rossi",
    amount: 1500,
    paidAmount: 1500,
    currency: "EUR",
    status: "paid",
    invoiceDate: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    items: [
      { id: "item_1", description: "Italian University Application & DOV Advisory", quantity: 1, unitPrice: 1500, total: 1500 }
    ],
    notes: "Full Consultancy & Universitaly Assistance Package",
    isDemo: true,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "inv_demo_2",
    invoiceNumber: "INV-2026-MN-002",
    studentId: "student_demo_2",
    studentName: "Aarav Patel",
    amount: 3500,
    paidAmount: 2000,
    currency: "USD",
    status: "partial",
    invoiceDate: new Date(Date.now() - 18 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    items: [
      { id: "item_2", description: "MNUMS Admission processing, Translation, Apostille & Visa Kit", quantity: 1, unitPrice: 3500, total: 3500 }
    ],
    notes: "MNUMS Admission processing, Translation, Apostille & Visa Kit",
    isDemo: true,
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "inv_demo_3",
    invoiceNumber: "INV-2026-IT-003",
    studentId: "student_demo_3",
    studentName: "Priya Sharma",
    amount: 2200,
    paidAmount: 0,
    currency: "EUR",
    status: "sent",
    invoiceDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
    items: [
      { id: "item_3", description: "IMAT Medicine Consultation & CIMEA Verification Assistance", quantity: 1, unitPrice: 2200, total: 2200 }
    ],
    notes: "IMAT Medicine Consultation & CIMEA Verification Assistance",
    isDemo: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 7. Demo Payments
export const SEED_PAYMENTS: Payment[] = [
  {
    id: "pay_demo_1",
    invoiceId: "inv_demo_1",
    invoiceNumber: "INV-2026-IT-001",
    studentId: "student_demo_1",
    studentName: "Matteo Rossi",
    amount: 1500,
    currency: "EUR",
    paymentDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    paymentMethod: "Bank Transfer",
    transactionReference: "SEPA-IT-9018237",
    notes: "Received into SKOLAR Milan Intesa Sanpaolo business account",
    isDemo: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "pay_demo_2",
    invoiceId: "inv_demo_2",
    invoiceNumber: "INV-2026-MN-002",
    studentId: "student_demo_2",
    studentName: "Aarav Patel",
    amount: 2000,
    currency: "USD",
    paymentDate: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
    paymentMethod: "Bank Transfer",
    transactionReference: "SWIFT-IN-449102",
    notes: "Initial 50% deposit for MNUMS registration and embassy submission",
    isDemo: true,
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 8. Demo Expenses
export const SEED_EXPENSES: Expense[] = [
  {
    id: "exp_demo_1",
    title: "Partner Commission - Harshit (Aarav Patel Admission)",
    category: "Partner Commission",
    amount: 300,
    currency: "EUR",
    date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
    partnerId: "partner_harshit",
    partnerName: "Harshit / EduVlog",
    studentId: "student_demo_2",
    studentName: "Aarav Patel",
    countryCode: "MN",
    description: "15% net share paid via international wire transfer",
    isDemo: true,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "exp_demo_2",
    title: "CIMEA Verification Fee - Priya Sharma",
    category: "Document Translation",
    amount: 150,
    currency: "EUR",
    date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    studentId: "student_demo_3",
    studentName: "Priya Sharma",
    countryCode: "IT",
    description: "Official Italian statement of comparability processing fee",
    isDemo: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 9. Demo Documents
export const SEED_DOCUMENTS: DocumentRecord[] = [
  {
    id: "doc_demo_1",
    studentId: "student_demo_1",
    studentName: "Matteo Rossi",
    countryCode: "IT",
    name: "Valid Italian Passport (Matteo Rossi)",
    category: "Passport",
    fileUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600",
    storagePath: "demo/passports/matteo_rossi.jpg",
    fileSize: 420000,
    fileType: "image/jpeg",
    uploadedBy: "system",
    uploadedByName: "Lead Portal",
    uploadDate: new Date(Date.now() - 28 * 86400000).toISOString(),
    reviewStatus: "Approved",
    isDemo: true,
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "doc_demo_2",
    studentId: "student_demo_2",
    studentName: "Aarav Patel",
    countryCode: "MN",
    name: "NEET 2025 Official Score Card (542 Marks)",
    category: "Academic Transcripts",
    fileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600",
    storagePath: "demo/academic/aarav_neet.jpg",
    fileSize: 680000,
    fileType: "image/jpeg",
    uploadedBy: "partner_harshit",
    uploadedByName: "Harshit / EduVlog",
    uploadDate: new Date(Date.now() - 18 * 86400000).toISOString(),
    reviewStatus: "Approved",
    isDemo: true,
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "doc_demo_3",
    studentId: "student_demo_3",
    studentName: "Priya Sharma",
    countryCode: "IT",
    name: "12th Grade Senior Secondary Marksheet",
    category: "Academic Transcripts",
    fileUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600",
    storagePath: "demo/academic/priya_12th.jpg",
    fileSize: 520000,
    fileType: "image/jpeg",
    uploadedBy: "partner_apex",
    uploadedByName: "Apex Global Overseas",
    uploadDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    reviewStatus: "Pending",
    isDemo: true,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Seeds comprehensive demonstration records into the system.
 * Writes directly into the fast local store first (guaranteed 100% success),
 * and asynchronously syncs to Firebase Cloud in the background.
 */
export async function seedInitialSystemData(): Promise<SeedResult> {
  // 1. Populate all local stores immediately (< 5ms)
  setLocalCache("countries", SEED_COUNTRIES);
  setLocalCache("customFieldDefinitions", SEED_CUSTOM_FIELDS);
  setLocalCache("partners", SEED_PARTNERS);
  setLocalCache("students", SEED_STUDENTS);
  setLocalCache("applications", SEED_APPLICATIONS);
  setLocalCache("invoices", SEED_INVOICES);
  setLocalCache("payments", SEED_PAYMENTS);
  setLocalCache("expenses", SEED_EXPENSES);
  setLocalCache("documents", SEED_DOCUMENTS);

  const totalRecords =
    SEED_COUNTRIES.length +
    SEED_CUSTOM_FIELDS.length +
    SEED_PARTNERS.length +
    SEED_STUDENTS.length +
    SEED_APPLICATIONS.length +
    SEED_INVOICES.length +
    SEED_PAYMENTS.length +
    SEED_EXPENSES.length +
    SEED_DOCUMENTS.length;

  // 2. Non-blocking cloud sync in background (if Firebase rules allow)
  withTimeout(
    (async () => {
      const batch = writeBatch(db);

      SEED_COUNTRIES.forEach(c => batch.set(doc(collection(db, "countries"), c.id), cleanFirestoreData(c)));
      SEED_CUSTOM_FIELDS.forEach(f => batch.set(doc(collection(db, "customFieldDefinitions"), f.id), cleanFirestoreData(f)));
      SEED_PARTNERS.forEach(p => batch.set(doc(collection(db, "partners"), p.id), cleanFirestoreData(p)));
      SEED_STUDENTS.forEach(s => batch.set(doc(collection(db, "students"), s.id), cleanFirestoreData(s)));
      SEED_APPLICATIONS.forEach(a => batch.set(doc(collection(db, "applications"), a.id), cleanFirestoreData(a)));
      SEED_INVOICES.forEach(i => batch.set(doc(collection(db, "invoices"), i.id), cleanFirestoreData(i)));
      SEED_PAYMENTS.forEach(p => batch.set(doc(collection(db, "payments"), p.id), cleanFirestoreData(p)));
      SEED_EXPENSES.forEach(e => batch.set(doc(collection(db, "expenses"), e.id), cleanFirestoreData(e)));
      SEED_DOCUMENTS.forEach(d => batch.set(doc(collection(db, "documents"), d.id), cleanFirestoreData(d)));

      await batch.commit();
      console.log(`[Cloud Sync]: Seeded ${totalRecords} records to Firebase Firestore.`);
    })(),
    3000
  ).catch(err => {
    console.debug("[Cloud Sync Notice]: Demo data stored in local store. Firebase sync pending rules:", err?.code || err?.message);
  });

  return {
    success: true,
    message: `Initialized ${totalRecords} SKOLAR business records across Italy & Mongolia operations.`,
    totalRecords,
  };
}

/**
 * Purges all demonstration records from the system.
 */
export async function clearDemoData(): Promise<{ success: boolean; count: number }> {
  let count = 0;
  const collections = [
    "students",
    "applications",
    "partners",
    "invoices",
    "payments",
    "expenses",
    "documents"
  ];

  collections.forEach(colName => {
    const current = getLocalCache<any>(colName) || [];
    const nonDemo = current.filter(item => !item.isDemo);
    count += (current.length - nonDemo.length);
    setLocalCache(colName, nonDemo);
  });

  return { success: true, count };
}

/**
 * Initializes a clean production workspace.
 * Ensures official operational countries (Italy, Mongolia) and schema definitions exist,
 * while ensuring no mock demo records linger in student directories, applications, or finance.
 */
export function initProductionWorkspace(): void {
  // 1. Ensure official countries (Italy & Mongolia)
  const currentCountries = getLocalCache<Country>("countries");
  if (!currentCountries || currentCountries.length === 0) {
    setLocalCache("countries", SEED_COUNTRIES);
  }

  // 2. Ensure baseline custom field definitions
  const currentFields = getLocalCache<CustomFieldDefinition>("customFieldDefinitions");
  if (!currentFields || currentFields.length === 0) {
    setLocalCache("customFieldDefinitions", SEED_CUSTOM_FIELDS);
  }

  // 3. Purge all mock demo records from operational collections
  clearDemoData();
}

/**
 * Backward compatible alias that initializes a clean workspace without seeding fake demo students
 */
export function autoBootstrapIfEmpty(): void {
  initProductionWorkspace();
}

/**
 * Removes all demo records completely and resets transactional data to clean production state.
 */
export function purgeAllDemoRecords(): { success: boolean; message: string } {
  clearDemoData();
  return {
    success: true,
    message: "Workspace sanitized. All demonstration data removed."
  };
}
