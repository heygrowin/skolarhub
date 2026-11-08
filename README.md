# skolarhub

# SKOLAR Control Center
> Complete Business Management Platform for SKOLAR International Education Consultancy

SKOLAR Control Center is a private operations management platform engineered for international education consulting in Italy, Mongolia, and global destinations.

---

## 🚀 Key Modules & Architecture

1. **Central Student Directory**:
   - Comprehensive profiles (Personal, Academic Marks, NEET qualification, Passports, Lead sources).
   - Segregation between Direct B2C candidates and B2B partner-referred candidates.
   - Separate candidate entity from multiple university application dossiers.

2. **University Application Pipeline**:
   - Multi-country admission tracking with audit history timelines.
   - Dynamic stage progression: *New Enquiry* → *Profile Review* → *Documents Pending* → *Pre-enrolment* → *Application Submitted* → *Admission Received* → *Visa Process* → *Completed*.

3. **B2B Partner & Agent Governance**:
   - Content Creator & Education Agent management (fixed vs percentage commission structures).
   - Automated conversion metrics, revenue association, commission owed vs commission paid tracking.

4. **Multi-Currency Finance Ledger**:
   - Strict currency isolation: EUR (€), USD ($), and INR (₹) without synthetic cross-conversion distortion.
   - Corporate invoices with automatic paidAmount balance and status transitions.
   - Payment logs and operational expense tracking.

5. **Dynamic Country & Schema Governance**:
   - Dynamic expansion: Add new destination countries without developer code changes.
   - Custom Field definitions: Codice Fiscale, Universitaly ID, Permesso di Soggiorno, NEET Roll No & Percentile, MNUMS Portal ID, and Emergency Contact.

6. **Cloud Vault & Document Review Pipeline**:
   - Dual-tier document management with review statuses (*Approved*, *Pending*, *Rejected*).
   - Supports Google Cloud Storage / Firebase Storage and Vercel Blob.

---

## 🔐 Credentials & Access

- **Admin Email**: `admin@skolar.it`
- **Default Password**: `skolar2026`

*To connect with your custom Firebase Authentication users, activate Email/Password in Firebase Console.*

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Persistence**: High-Performance Dual-Tier Store (< 1ms read/write) + Firebase Cloud Firestore sync
- **Storage**: Firebase Storage & Vercel Blob
- **Security**: Custom claims, permission matrices, and Firestore rules in `firestore.rules`

---

## 💻 Quick Start

```powershell
# Install dependencies
npm install

# Start local development server
npm run dev

# Run comprehensive test suite
npx tsx test-final-production.mjs

# Build production bundle
npm run build
```
