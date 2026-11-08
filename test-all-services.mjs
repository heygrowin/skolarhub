/**
 * Comprehensive SKOLAR Control Center All-Services Integration Test
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

async function runComprehensiveTest() {
  console.log("================================================================");
  console.log("   SKOLAR CONTROL CENTER - FULL SERVICE INTEGRATION TEST       ");
  console.log("================================================================\n");

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

  // 1. Import all services
  const { seedInitialSystemData, clearDemoData } = await import('./src/lib/seedData.ts');
  const { getStudents, createStudent, updateStudent, deleteStudent } = await import('./src/services/studentService.ts');
  const { getApplications, createApplication, updateApplicationStatus } = await import('./src/services/applicationService.ts');
  const { getPartners, createPartner, calculatePartnerMetrics } = await import('./src/services/partnerService.ts');
  const { getCountries, createCountry } = await import('./src/services/countryService.ts');
  const { getInvoices, createInvoice, getPayments, recordPayment, getExpenses, recordExpense } = await import('./src/services/financeService.ts');
  const { getDocuments, createDocumentRecord } = await import('./src/services/documentService.ts');
  const { getTeamMembers, createOrUpdateUserProfile } = await import('./src/services/teamService.ts');
  const { getCustomFields, createCustomField } = await import('./src/services/customFieldService.ts');

  // STEP 1: Seed Initial Data
  console.log("1. Testing System Seeding Engine (Data Filling):");
  const t0 = Date.now();
  const seedRes = await seedInitialSystemData();
  const seedDuration = Date.now() - t0;
  assert(seedRes.success === true, "seedInitialSystemData executed successfully");
  assert(seedDuration < 50, `Seeding 25 records completed in ${seedDuration}ms (< 50ms)`);

  // STEP 2: Verify Initial Seeded Counts
  console.log("\n2. Verifying Seeded Datasets in Local Store:");
  const initialStudents = await getStudents();
  assert(initialStudents.students.length === 3, "Seeded exactly 3 demo students");
  
  const initialApps = await getApplications();
  assert(initialApps.length === 3, "Seeded exactly 3 demo applications");

  const initialPartners = await getPartners();
  assert(initialPartners.length === 2, "Seeded exactly 2 B2B partners (Harshit & Apex)");

  const initialCountries = await getCountries();
  assert(initialCountries.length >= 2, "Seeded baseline countries (Italy & Mongolia)");

  const initialInvoices = await getInvoices();
  assert(initialInvoices.length === 3, "Seeded exactly 3 demo invoices");

  const initialPayments = await getPayments();
  assert(initialPayments.length === 2, "Seeded exactly 2 demo payments");

  const initialExpenses = await getExpenses();
  assert(initialExpenses.length === 2, "Seeded exactly 2 demo expenses");

  const initialDocs = await getDocuments();
  assert(initialDocs.length === 3, "Seeded exactly 3 demo documents");

  // STEP 3: Student Management CRUD & Filters
  console.log("\n3. Testing Student Management (Insertion, Search, Filters):");
  const tInsertStudent = Date.now();
  const createdStudent = await createStudent({
    fullName: "Karan Johar",
    email: "karan.johar@test.com",
    phone: "+91 98111 22233",
    nationality: "Indian",
    acquisitionType: "B2C",
    countryOfInterest: "IT",
    dateOfBirth: "2003-01-01",
    previousEducation: "High School",
    schoolOrUniversity: "Delhi Public School",
    academicMarks: "95%",
    registrationDate: new Date().toISOString(),
    notes: "Test student insertion"
  });
  const insertDuration = Date.now() - tInsertStudent;
  assert(createdStudent.id !== undefined, "Student created with unique ID");
  assert(insertDuration < 20, `createStudent completed in ${insertDuration}ms (< 20ms)`);

  // Query by search
  const searchRes = await getStudents({ searchQuery: "Karan" });
  assert(searchRes.students.length === 1 && searchRes.students[0].fullName === "Karan Johar", "Search query found Karan Johar");

  // Filter by country
  const italyRes = await getStudents({ country: "IT" });
  assert(italyRes.students.some(s => s.fullName === "Karan Johar"), "Country filter 'IT' includes newly inserted candidate");

  // Update student
  await updateStudent(createdStudent.id, { phone: "+91 99999 88888" });
  const updatedList = await getStudents({ searchQuery: "Karan" });
  assert(updatedList.students[0].phone === "+91 99999 88888", "Student phone successfully updated");

  // STEP 4: Application Management
  console.log("\n4. Testing University Applications (Dossier Tracking):");
  const createdApp = await createApplication({
    studentId: createdStudent.id,
    studentName: createdStudent.fullName,
    countryId: "country_IT",
    countryCode: "IT",
    countryName: "Italy",
    university: "Università di Bologna",
    course: "BSc Economics & Finance",
    intake: "Fall 2026",
    status: "New Enquiry",
    notes: "Initial dossier opened"
  }, "admin_uid", "Super Admin");
  assert(createdApp.id !== undefined, "Application created with timeline item");

  // Transition status
  await updateApplicationStatus(createdApp.id, "Admission Received", { uid: "admin_uid", displayName: "Super Admin" }, "Accepted!");
  const appsForStudent = await getApplications({ studentId: createdStudent.id });
  assert(appsForStudent[0].status === "Admission Received", "Application status updated to 'Admission Received'");
  assert(appsForStudent[0].statusHistory.length === 2, "Status history timeline contains 2 audit entries");

  // STEP 5: B2B Partner Integration & Commission
  console.log("\n5. Testing B2B Partner Operations & Automated Metrics:");
  const createdPartner = await createPartner({
    name: "Global Edu Connect",
    partnerType: "Education Agent",
    contactPerson: "Vikram Malhotra",
    email: "vikram@globaledu.test",
    phone: "+91 98888 77777",
    company: "Global Edu Connect Pvt Ltd",
    country: "India",
    commissionType: "percentage",
    commissionRate: 10,
    currency: "EUR",
    status: "active",
    notes: "New partner test"
  });
  assert(createdPartner.id !== undefined, "B2B Partner created successfully");

  const partnerMetrics = await calculatePartnerMetrics("partner_harshit");
  assert(partnerMetrics.totalReferredStudents === 1, "Harshit has 1 referred student (Aarav Patel)");
  assert(partnerMetrics.activeApplications === 1, "Harshit has 1 active application");

  // STEP 6: Finance Ledger (Invoices, Payments, Margin, Payouts)
  console.log("\n6. Testing Finance Ledger (Multi-currency, Auto-balance, Segregation):");
  const createdInv = await createInvoice({
    invoiceNumber: "INV-TEST-999",
    studentId: createdStudent.id,
    studentName: createdStudent.fullName,
    amount: 1000,
    currency: "EUR",
    status: "sent",
    issueDate: "2026-11-08",
    dueDate: "2026-12-08",
    notes: "BSc Consultation Fee"
  });
  assert(createdInv.paidAmount === 0, "New invoice has 0 paidAmount");

  // Record payment against invoice
  const recordedPay = await recordPayment({
    invoiceId: createdInv.id,
    studentId: createdStudent.id,
    studentName: createdStudent.fullName,
    amount: 1000,
    currency: "EUR",
    paymentDate: "2026-11-08",
    paymentMethod: "Stripe",
    referenceNumber: "ch_test_12345",
    notes: "Full invoice payment"
  });
  assert(recordedPay.id !== undefined, "Payment recorded successfully");

  // Verify invoice auto-status transition
  const invsAfterPay = await getInvoices(createdStudent.id);
  const matchedInv = invsAfterPay.find(i => i.id === createdInv.id);
  assert(matchedInv && matchedInv.paidAmount === 1000, "Invoice paidAmount updated to 1000");
  assert(matchedInv && matchedInv.status === "paid", "Invoice status auto-transitioned to 'paid'");

  // Record an expense
  const recordedExp = await recordExpense({
    title: "Document translation service",
    category: "student_service",
    amount: 120,
    currency: "EUR",
    expenseDate: "2026-11-08",
    studentId: createdStudent.id,
    studentName: createdStudent.fullName,
    countryCode: "IT",
    notes: "Sworn translation fee"
  });
  assert(recordedExp.id !== undefined, "Expense recorded successfully");

  // STEP 7: Custom Fields & Dynamic Country Config
  console.log("\n7. Testing Dynamic Country Config & Custom Fields:");
  const newCountry = await createCountry({
    name: "Germany",
    code: "DE",
    flag: "🇩🇪",
    description: "Public TU9 Universities, Tuition Free Engineering",
    websiteUrl: "https://skolar.it/germany",
    status: "active",
    defaultCurrency: "EUR",
    settings: {
      requiredDocuments: ["APS Certificate", "TestAS Scorecard", "Passport"],
      universities: ["TUM Munich", "RWTH Aachen", "TU Berlin"],
      applicationStages: ["Enquiry", "APS Verification", "Uni-Assist Submission", "Admission"]
    }
  });
  assert(newCountry.id === "country_DE", "Dynamic country created with custom code 'country_DE'");

  const allCountriesAfterAdd = await getCountries();
  assert(allCountriesAfterAdd.some(c => c.code === "DE"), "New country Germany appears in directory");

  const createdField = await createCustomField({
    fieldName: "APS Certificate Number",
    key: "apsCertNo",
    description: "Akademische Prüfstelle certificate verification number",
    fieldType: "text",
    required: true,
    countryCode: "DE",
    displayOrder: 1
  });
  assert(createdField.id !== undefined, "Custom field created for Germany");

  const deFields = await getCustomFields("DE");
  assert(deFields.some(f => f.key === "apsCertNo"), "Country custom field query retrieves APS Certificate Number");

  // STEP 8: Cleanup and Demo Purge Test
  console.log("\n8. Testing Demo Data Purge Governance:");
  const purgeRes = await clearDemoData();
  assert(purgeRes.success === true, "clearDemoData executed successfully");
  assert(purgeRes.count > 0, `Purged ${purgeRes.count} demonstration records`);

  // Verify non-demo candidate Karan Johar is strictly preserved
  const studentsAfterPurge = await getStudents();
  assert(studentsAfterPurge.students.some(s => s.fullName === "Karan Johar"), "Real non-demo candidate 'Karan Johar' is preserved after demo purge");

  // Final Summary
  console.log("\n================================================================");
  console.log(`   INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED `);
  console.log("================================================================");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runComprehensiveTest().catch(err => {
  console.error("Test Suite Runtime Exception:", err);
  process.exit(1);
});

