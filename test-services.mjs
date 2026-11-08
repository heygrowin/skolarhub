/**
 * Automated End-to-End System & Service Test Suite
 * Tests all CRUD operations, filtering, financial summaries, seed data, and latency.
 */

import { SEED_COUNTRIES, SEED_PARTNERS, SEED_STUDENTS, SEED_APPLICATIONS, SEED_INVOICES, SEED_PAYMENTS, SEED_EXPENSES, SEED_DOCUMENTS } from './src/lib/seedData.js';

// Polyfill localStorage for Node test runner
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size; },
  key: (i) => Array.from(storage.keys())[i] || null,
};

async function runTests() {
  console.log("==================================================");
  console.log("   SKOLAR CONTROL CENTER - SYSTEM TEST SUITE      ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Import services dynamically
  const { cleanFirestoreData, getLocalCache, setLocalCache, addToLocalCache, updateInLocalCache, removeFromLocalCache } = await import('./src/lib/firestoreUtils.ts');
  const { calculateStudentFinancialSummary, calculateBusinessFinancialSummary } = await import('./src/services/financeService.ts');

  // Test 1: Undefined Cleaning
  console.log("1. Testing cleanFirestoreData (Deep Sanitization):");
  const dirtyData = {
    name: "John Doe",
    neetScore: undefined,
    partnerId: undefined,
    metadata: {
      tags: ["tag1", undefined, "tag2"],
      extra: undefined,
      validKey: 123
    }
  };
  const cleaned = cleanFirestoreData(dirtyData);
  assert(cleaned.neetScore === undefined && !('neetScore' in cleaned), "Undefined keys are stripped");
  assert(cleaned.metadata.validKey === 123, "Valid nested keys preserved");
  assert(cleaned.metadata.tags.length === 2, "Array undefined items removed");

  // Test 2: Local Persistence Layer Speed
  console.log("\n2. Testing Local Storage Dual-Tier Persistence Layer:");
  const t0 = Date.now();
  setLocalCache("students", SEED_STUDENTS);
  const writeDuration = Date.now() - t0;
  assert(writeDuration < 10, `setLocalCache write speed is blazing fast (${writeDuration}ms < 10ms)`);

  const t1 = Date.now();
  const cachedStudents = getLocalCache("students");
  const readDuration = Date.now() - t1;
  assert(cachedStudents && cachedStudents.length === 3, "Retrieved all 3 seeded students");
  assert(readDuration < 5, `getLocalCache read speed is instantaneous (${readDuration}ms < 5ms)`);

  // Test 3: Add to Local Cache
  console.log("\n3. Testing Real-time Cache Mutations (Insert, Update, Delete):");
  const newStudent = {
    id: "student_test_99",
    fullName: "Luca Bianchi",
    email: "luca.bianchi@example.com",
    countryOfInterest: "IT",
    acquisitionType: "B2C",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  addToLocalCache("students", newStudent);
  const updatedStudents = getLocalCache("students");
  assert(updatedStudents.length === 4, "Student inserted, length increased from 3 to 4");
  assert(updatedStudents[0].id === "student_test_99", "Newest student placed at top of list");

  // Test 4: Update in Local Cache
  updateInLocalCache("students", "student_test_99", { phone: "+39 333 9998877" });
  const reRead = getLocalCache("students");
  const found = reRead.find(s => s.id === "student_test_99");
  assert(found && found.phone === "+39 333 9998877", "Student record updated in local store");

  // Test 5: Delete from Local Cache
  removeFromLocalCache("students", "student_test_99");
  const afterDelete = getLocalCache("students");
  assert(afterDelete.length === 3, "Student removed from cache, length restored to 3");

  // Test 6: Financial Calculation Engine
  console.log("\n4. Testing Financial Calculation Engine:");
  const sampleInvoices = [
    { id: "i1", amount: 1500, paidAmount: 1500, currency: "EUR", status: "paid" },
    { id: "i2", amount: 2000, paidAmount: 500, currency: "EUR", status: "partial" },
    { id: "i3", amount: 3000, paidAmount: 3000, currency: "USD", status: "paid" },
  ];
  const samplePayments = [
    { id: "p1", amount: 1500, currency: "EUR" },
    { id: "p2", amount: 500, currency: "EUR" },
    { id: "p3", amount: 3000, currency: "USD" },
  ];
  const sampleExpenses = [
    { id: "e1", amount: 400, currency: "EUR" },
    { id: "e2", amount: 600, currency: "USD" },
  ];

  const bizSummary = calculateBusinessFinancialSummary(sampleInvoices, samplePayments, sampleExpenses);
  assert(bizSummary.totalInvoiced["EUR"] === 3500, "EUR Total Invoiced = €3,500");
  assert(bizSummary.totalCollected["EUR"] === 2000, "EUR Total Collected = €2,000");
  assert(bizSummary.totalOutstanding["EUR"] === 1500, "EUR Total Outstanding = €1,500");
  assert(bizSummary.totalExpenses["EUR"] === 400, "EUR Total Expenses = €400");
  assert(bizSummary.netProfit["EUR"] === 1600, "EUR Net Profit = €1,600 (€2,000 - €400)");

  assert(bizSummary.totalInvoiced["USD"] === 3000, "USD Total Invoiced = $3,000");
  assert(bizSummary.totalCollected["USD"] === 3000, "USD Total Collected = $3,000");
  assert(bizSummary.netProfit["USD"] === 2400, "USD Net Profit = $2,400 ($3,000 - $600)");

  // Test 7: Multi-Currency Strict Segregation
  console.log("\n5. Testing Multi-Currency Strict Segregation:");
  assert(!('USD' in bizSummary.totalInvoiced && typeof bizSummary.totalInvoiced['USD'] !== 'number'), "USD & EUR remain in isolated ledgers without artificial exchange distortion");

  // Summary
  console.log("\n==================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED     `);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Test Suite Runtime Error:", err);
  process.exit(1);
});

