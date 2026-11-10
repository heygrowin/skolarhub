/**
 * End-to-End Live Firebase + Vercel Blob + Proxy Verification Test
 * Tests real Cloud Firestore persistence across simulated browser refreshes,
 * Year-wise intake filtering, Payment Edit recalculation, Invoice Discounts,
 * Custom Option persistence, and Live Vercel Blob /api/blob upload+download.
 */

const storageMap = new Map();
global.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (i) => Array.from(storageMap.keys())[i] || null,
};
global.window = {
  localStorage: global.localStorage,
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o?.detail; } },
};

async function runLiveVerification() {
  console.log("=================================================================");
  console.log("   SKOLAR LIVE FIREBASE + VERCEL BLOB END-TO-END VERIFICATION    ");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(cond, label) {
    if (cond) {
      console.log(`  ✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${label}`);
      failed++;
    }
  }

  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const { auth } = await import("./src/lib/firebase.ts");
  const { invalidateCache } = await import("./src/lib/firestoreUtils.ts");
  const { createStudent, getStudents, deleteStudent } = await import("./src/services/studentService.ts");
  const { createInvoice, getInvoices, recordPayment, updatePayment, deletePayment, deleteInvoice } = await import("./src/services/financeService.ts");
  const { createApplication, getApplications, deleteApplication } = await import("./src/services/applicationService.ts");
  const { createDocumentRecord, getDocuments, deleteDocumentRecord } = await import("./src/services/documentService.ts");
  const { saveCustomOption, getCustomOptionsForCategory, removeCustomOption } = await import("./src/services/customOptionService.ts");

  // 1. Live Firebase Sign In (not auto-login!)
  console.log("1. Testing Real Firebase Auth Login (admin@skolar.it):");
  const cred = await signInWithEmailAndPassword(auth, "admin@skolar.it", "skolar2026");
  assert(!!cred.user?.uid, `Signed into Firebase Auth UID: ${cred.user?.uid}`);

  // Track temp IDs for cleanup
  let tempStudentId = "";
  let tempAppId = "";
  let tempInvoiceId = "";
  let tempPaymentId = "";
  let tempDocId = "";
  let tempBlobUrl = "";

  try {
    // 2. Custom Option Persistence across Refresh
    console.log("\n2. Testing Creatable Custom Options (e.g. 'UPI - Live Test') Persistence:");
    await saveCustomOption("payment_methods", "UPI - Live Test");
    storageMap.clear();
    invalidateCache();
    const optsAfterRefresh = await getCustomOptionsForCategory("payment_methods");
    assert(optsAfterRefresh.includes("UPI - Live Test"), "Custom option persisted to Firestore & survived full cache/localStorage wipe");
    await removeCustomOption("payment_methods", "UPI - Live Test");

    // 3. Year-Wise Student Creation + Refresh Persistence
    console.log("\n3. Testing Year-Wise Student Creation & Survival After Hard Refresh:");
    const student = await createStudent({
      fullName: "Elena Moretti LiveTest",
      email: "elena.livetest@skolar.it",
      phone: "+39 349 0001112",
      dateOfBirth: "2004-02-10",
      nationality: "Italian",
      address: "Via Torino 8, Milan",
      passportNumber: "YB112233",
      intakeYear: "2027",
      previousEducation: "High School (12th Grade)",
      schoolOrUniversity: "Liceo Volta",
      academicMarks: "95/100",
      acquisitionType: "B2C",
      countryOfInterest: "IT",
      leadSource: "Website Form (skolar.it)",
      registrationDate: new Date().toISOString(),
      customFields: { codiceFiscale: "MRTLNE04B50F205K" },
    });
    tempStudentId = student.id;
    assert(!!student.id, `Created student in Firestore with ID ${student.id}`);

    // Create Application with intakeYear
    const app = await createApplication({
      studentId: student.id,
      studentName: student.fullName,
      countryId: "country_IT",
      countryCode: "IT",
      countryName: "Italy",
      intakeYear: "2027",
      university: "Politecnico di Milano",
      course: "MSc Computer Engineering",
      intake: "Fall 2027",
      status: "New Enquiry",
    }, cred.user.uid, "Master Admin");
    tempAppId = app.id;

    // Create Invoice with Discount & Year
    console.log("\n4. Testing Invoice Discount, Payment Creation & Payment Editing:");
    const inv = await createInvoice({
      invoiceNumber: `SKL-TEST-${Date.now()}`,
      studentId: student.id,
      studentName: student.fullName,
      countryCode: "IT",
      intakeYear: "2027",
      subtotal: 2000,
      discount: 300,
      discountType: "percentage",
      discountValue: 15,
      discountReason: "Early Bird Scholarship",
      taxRate: 0,
      taxAmount: 0,
      amount: 1700,
      invoiceDate: "2026-11-10",
      dueDate: "2026-12-10",
      status: "sent",
      items: [{ id: "1", description: "Advisory Package", quantity: 1, unitPrice: 2000, total: 2000 }],
      notes: "Test invoice with 15% discount",
    });
    tempInvoiceId = inv.id;

    // Record Initial Payment (partial: 700 EUR)
    const pay = await recordPayment({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      studentId: student.id,
      studentName: student.fullName,
      intakeYear: "2027",
      amount: 700,
      currency: "EUR",
      paymentDate: "2026-11-10",
      paymentMethod: "UPI - Ansh",
      transactionReference: "UTR-TEST-001",
      notes: "First installment",
    });
    tempPaymentId = pay.id;

    let invCheck1 = (await getInvoices(student.id)).find(i => i.id === inv.id);
    assert(invCheck1?.paidAmount === 700 && invCheck1?.status === "partial", "Invoice updated to partial (€700 paid)");

    // Edit Payment -> update amount to 1700 and method/notes
    await updatePayment(pay.id, {
      amount: 1700,
      paymentMethod: "Bank Transfer",
      transactionReference: "SEPA-UPDATED-999",
      notes: "Edited to full payment",
    });

    // SIMULATE FULL BROWSER HARD REFRESH (clear localStorage & memory cache completely!)
    console.log("\n5. Simulating Full Browser Refresh (Wiping Memory & LocalStorage):");
    storageMap.clear();
    invalidateCache();

    const reloaded2027Students = await getStudents({ intakeYear: "2027" });
    assert(
      reloaded2027Students.students.some(s => s.id === student.id && s.intakeYear === "2027"),
      "Student survived hard refresh & returned under 2027 intake year filter from Firestore"
    );

    const reloadedApps = await getApplications({ intakeYear: "2027" });
    assert(reloadedApps.some(a => a.id === app.id), "Application survived hard refresh from Firestore");

    const reloadedInvs = await getInvoices(student.id);
    const invAfterRefresh = reloadedInvs.find(i => i.id === inv.id);
    assert(
      invAfterRefresh?.discount === 300 && invAfterRefresh?.discountReason === "Early Bird Scholarship",
      "Invoice discount details (€300 Early Bird Scholarship) persisted in Firestore"
    );
    assert(
      invAfterRefresh?.paidAmount === 1700 && invAfterRefresh?.status === "paid",
      "Edited payment recalculated invoice paidAmount to €1,700 & status to 'paid' in Firestore!"
    );

    // 6. Test Live Vercel Blob Private Proxy via Vite Preview/Server
    console.log("\n6. Testing Live Compliance Upload & Private Preview Proxy (/api/blob):");
    const { createServer } = await import("vite");
    const server = await createServer({ server: { port: 3459, strictPort: true } });
    await server.listen();
    try {
      const sampleContent = "SKOLAR Compliance PDF Payload Test";
      const upRes = await fetch("http://localhost:3459/api/blob?pathname=compliance/test_compliance.txt", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: sampleContent,
      });
      const upJson = await upRes.json();
      tempBlobUrl = upJson.url || "";
      assert(upRes.status === 200 && tempBlobUrl.includes(".private.blob.vercel-storage.com/"), `Uploaded to private Vercel Blob via /api/blob: ${tempBlobUrl}`);

      // Save document record in Firestore
      const docRec = await createDocumentRecord({
        name: "test_compliance.txt",
        studentId: student.id,
        studentName: student.fullName,
        countryCode: "IT",
        intakeYear: "2027",
        category: "Passport",
        uploadedBy: cred.user.uid,
        uploadedByName: "Master Admin",
        uploadDate: new Date().toISOString(),
        storagePath: upJson.pathname,
        fileUrl: tempBlobUrl,
        fileSize: sampleContent.length,
        fileType: "text/plain",
        reviewStatus: "Pending",
      });
      tempDocId = docRec.id;

      // Test GET through /api/blob proxy (what <img> / <iframe> / Open Original uses)
      const dlRes = await fetch(`http://localhost:3459/api/blob?url=${encodeURIComponent(tempBlobUrl)}`);
      const dlText = await dlRes.text();
      assert(dlRes.status === 200 && dlText === sampleContent, "Private Vercel Blob streamed cleanly with HTTP 200 (zero 403!)");

      // Refresh check for document record in Firestore
      storageMap.clear();
      invalidateCache();
      const reloadedDocs = await getDocuments({ studentId: student.id });
      assert(reloadedDocs.some(d => d.id === docRec.id), "Document metadata record survived hard refresh from Firestore");

      // Delete document record + remote Vercel blob
      await deleteDocumentRecord(docRec.id, docRec.storagePath, docRec.fileUrl);
      // Verify cleanup inside vite proxy endpoint
      await fetch(`http://localhost:3459/api/blob?url=${encodeURIComponent(tempBlobUrl)}`, { method: "DELETE" });
      tempDocId = "";
      tempBlobUrl = "";
    } finally {
      await server.close();
    }
  } finally {
    console.log("\n7. Cleaning up temporary test artifacts from Cloud Firestore...");
    if (tempDocId) await deleteDocumentRecord(tempDocId, undefined, tempBlobUrl).catch(() => {});
    if (tempPaymentId) await deletePayment(tempPaymentId).catch(() => {});
    if (tempInvoiceId) await deleteInvoice(tempInvoiceId).catch(() => {});
    if (tempAppId) await deleteApplication(tempAppId).catch(() => {});
    if (tempStudentId) await deleteStudent(tempStudentId).catch(() => {});
  }

  console.log("\n=================================================================");
  console.log(`   LIVE E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");
  process.exit(failed > 0 ? 1 : 0);
}

runLiveVerification().catch(err => {
  console.error("E2E Verification Exception:", err);
  process.exit(1);
});

