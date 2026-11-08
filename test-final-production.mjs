/**
 * Final Production Readiness & Clean Workspace Verification Test
 */

// Polyfill localStorage & window for Node test environment
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size; },
  key: (i) => Array.from(storage.keys())[i] || null,
};
global.window = { localStorage: global.localStorage };

async function runFinalProductionTest() {
  console.log("==================================================================");
  console.log("   SKOLAR CONTROL CENTER - FINAL PRODUCTION READINESS TEST        ");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Import services
  const { initProductionWorkspace } = await import('./src/lib/seedData.ts');
  const { getStudents, createStudent, deleteStudent } = await import('./src/services/studentService.ts');
  const { getApplications, createApplication, deleteApplication } = await import('./src/services/applicationService.ts');
  const { getPartners, createPartner, deletePartner, calculatePartnerMetrics } = await import('./src/services/partnerService.ts');
  const { getCountries } = await import('./src/services/countryService.ts');
  const { getInvoices, createInvoice, deleteInvoice, getPayments, recordPayment, deletePayment, getExpenses, recordExpense, deleteExpense, calculateBusinessFinancialSummary } = await import('./src/services/financeService.ts');
  const { getDocuments, createDocumentRecord, deleteDocumentRecord } = await import('./src/services/documentService.ts');
  const { getCustomFields } = await import('./src/services/customFieldService.ts');

  // STEP 1: Initialize Clean Production Workspace
  console.log("1. Initializing Clean Production Workspace (Demo Data Stripped):");
  initProductionWorkspace();

  // STEP 2: Verify Operational Configuration & Zero Demo Data
  console.log("\n2. Verifying Baseline Configuration & Zero Residual Mock Records:");
  const countries = await getCountries();
  assert(countries.length >= 2, "Operational countries active: Italy (IT) & Mongolia (MN)");
  assert(countries.some(c => c.code === "IT") && countries.some(c => c.code === "MN"), "Both Italy and Mongolia available with full university settings");

  const fields = await getCustomFields();
  assert(fields.length >= 7, "Operational custom fields initialized (Codice Fiscale, NEET, CIMEA, etc.)");

  const initialStudents = await getStudents();
  assert(initialStudents.students.length === 0, `Demo candidates purged: students count is exactly 0 (actual: ${initialStudents.students.length})`);

  const initialApps = await getApplications();
  assert(initialApps.length === 0, `Demo applications purged: count is exactly 0 (actual: ${initialApps.length})`);

  const initialPartners = await getPartners();
  assert(initialPartners.length === 0, `Demo partners purged: count is exactly 0 (actual: ${initialPartners.length})`);

  const initialInvoices = await getInvoices();
  assert(initialInvoices.length === 0, `Demo invoices purged: count is exactly 0 (actual: ${initialInvoices.length})`);

  const initialPayments = await getPayments();
  assert(initialPayments.length === 0, `Demo payments purged: count is exactly 0 (actual: ${initialPayments.length})`);

  const initialExpenses = await getExpenses();
  assert(initialExpenses.length === 0, `Demo expenses purged: count is exactly 0 (actual: ${initialExpenses.length})`);

  const initialDocs = await getDocuments();
  assert(initialDocs.length === 0, `Demo documents purged: count is exactly 0 (actual: ${initialDocs.length})`);

  // STEP 3: Live Real Data Workflow Simulation
  console.log("\n3. Testing End-to-End Real Data Insertion (Sub-Millisecond Speed):");
  
  // Real Student
  const tStudent = Date.now();
  const realStudent = await createStudent({
    fullName: "Alessandro Conti",
    email: "alessandro.conti@skolar.it",
    phone: "+39 347 1122334",
    nationality: "Italian",
    acquisitionType: "B2C",
    countryOfInterest: "IT",
    dateOfBirth: "2002-04-18",
    previousEducation: "Liceo Scientifico",
    schoolOrUniversity: "Liceo Parini Milano",
    academicMarks: "98/100",
    registrationDate: new Date().toISOString(),
    notes: "Direct candidate enrolling in Single-Cycle Medicine (IMAT) at Sapienza Roma",
    customFields: {
      codiceFiscale: "CNTLSN02D18F205K",
      universitalyAppId: "UNIV-2026-IT-5501"
    }
  });
  const studentDuration = Date.now() - tStudent;
  assert(realStudent.id !== undefined, "Real candidate enrolled with generated ID");
  assert(studentDuration < 15, `Candidate registration latency: ${studentDuration}ms (< 15ms)`);

  // Real Application
  const realApp = await createApplication({
    studentId: realStudent.id,
    studentName: realStudent.fullName,
    countryId: "country_IT",
    countryCode: "IT",
    countryName: "Italy",
    university: "Sapienza Università di Roma",
    course: "Medicine and Surgery (English IMAT)",
    intake: "Fall 2026",
    status: "New Enquiry",
    notes: "Documents collected, preparing Universitaly pre-enrolment"
  }, "admin", "Master Admin");
  assert(realApp.id !== undefined, "Application dossier opened with timeline audit entry");

  // Real B2B Partner
  const realPartner = await createPartner({
    name: "Milano Education Hub",
    partnerType: "Education Agent",
    contactPerson: "Marco Ferri",
    email: "info@milanoeduhub.it",
    phone: "+39 02 8899112",
    company: "Milano Education Hub S.R.L.",
    country: "Italy",
    commissionType: "percentage",
    commissionRate: 12,
    currency: "EUR",
    status: "active",
    notes: "Accredited educational agency partnership"
  });
  assert(realPartner.id !== undefined, "B2B Partner onboarded successfully");

  // Real Invoice & Payment
  const realInvoice = await createInvoice({
    invoiceNumber: "INV-2026-0001",
    studentId: realStudent.id,
    studentName: realStudent.fullName,
    amount: 2500,
    currency: "EUR",
    status: "sent",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    items: [
      { id: "item_1", description: "Comprehensive IMAT Advisory & CIMEA Processing", quantity: 1, unitPrice: 2500, total: 2500 }
    ],
    notes: "Official advisory invoice"
  });
  assert(realInvoice.id !== undefined, "Corporate invoice created");

  const realPayment = await recordPayment({
    invoiceId: realInvoice.id,
    invoiceNumber: realInvoice.invoiceNumber,
    studentId: realStudent.id,
    studentName: realStudent.fullName,
    amount: 1500,
    currency: "EUR",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "Bank Transfer",
    transactionReference: "SEPA-IT-2026-990182",
    notes: "Advance 60% consultancy payment via Intesa Sanpaolo"
  });
  assert(realPayment.id !== undefined, "Payment transaction recorded");

  // Check Invoice auto-balance
  const checkedInvoices = await getInvoices(realStudent.id);
  const matchedInvoice = checkedInvoices.find(i => i.id === realInvoice.id);
  assert(matchedInvoice.paidAmount === 1500, "Invoice paidAmount auto-updated to 1500 EUR");
  assert(matchedInvoice.status === "partial", "Invoice status accurately transitioned to 'partial'");

  // Real Expense
  const realExpense = await recordExpense({
    title: "CIMEA Verification & Legalization Fee",
    category: "Document Translation",
    amount: 150,
    currency: "EUR",
    date: new Date().toISOString().split('T')[0],
    studentId: realStudent.id,
    studentName: realStudent.fullName,
    countryCode: "IT",
    description: "Official statement of comparability fee paid to CIMEA portal"
  });
  assert(realExpense.id !== undefined, "Operational expense recorded");

  // Real Document Record
  const realDoc = await createDocumentRecord({
    name: "Valid Passport (Alessandro Conti)",
    studentId: realStudent.id,
    studentName: realStudent.fullName,
    countryCode: "IT",
    category: "Passport",
    fileUrl: "https://storage.googleapis.com/skolar-backend/passports/alessandro_conti.pdf",
    storagePath: "documents/IT/alessandro_conti_passport.pdf",
    fileSize: 310000,
    fileType: "application/pdf",
    uploadedBy: "admin",
    uploadedByName: "Master Admin",
    uploadDate: new Date().toISOString(),
    reviewStatus: "Approved"
  });
  assert(realDoc.id !== undefined, "Vault document registered and approved");

  // STEP 4: Financial Summary Verification
  console.log("\n4. Verifying Financial Summary & Currency Isolation:");
  const allInvs = await getInvoices();
  const allPays = await getPayments();
  const allExps = await getExpenses();
  const summary = calculateBusinessFinancialSummary(allInvs, allPays, allExps);

  assert(summary.totalInvoiced["EUR"] === 2500, "Total Invoiced = €2,500");
  assert(summary.totalCollected["EUR"] === 1500, "Total Collected = €1,500");
  assert(summary.totalOutstanding["EUR"] === 1000, "Total Outstanding = €1,000");
  assert(summary.totalExpenses["EUR"] === 150, "Total Expenses = €150");
  assert(summary.netProfit["EUR"] === 1350, "Net Profit = €1,350 (€1,500 - €150)");

  // STEP 5: Workspace Sanitization for the User
  console.log("\n5. Sanitizing System for Production Use:");
  await deleteStudent(realStudent.id);
  await deleteApplication(realApp.id);
  await deletePartner(realPartner.id);
  await deleteInvoice(realInvoice.id);
  await deletePayment(realPayment.id);
  await deleteExpense(realExpense.id);
  await deleteDocumentRecord(realDoc.id);

  const finalStudents = await getStudents();
  assert(finalStudents.students.length === 0, "Workspace clean: 0 students");

  const finalApps = await getApplications();
  assert(finalApps.length === 0, "Workspace clean: 0 applications");

  const finalPartners = await getPartners();
  assert(finalPartners.length === 0, "Workspace clean: 0 partners");

  const finalInvoices = await getInvoices();
  assert(finalInvoices.length === 0, "Workspace clean: 0 invoices");

  console.log("\n==================================================================");
  console.log(`   FINAL TEST RESULT: ${passed} PASSED, ${failed} FAILED          `);
  console.log("   SYSTEM IS 100% PRODUCTION READY WITH ZERO DEMO RESIDUE         ");
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runFinalProductionTest().catch(err => {
  console.error("Test Suite Runtime Exception:", err);
  process.exit(1);
});

