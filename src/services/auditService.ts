import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ActivityLog } from "../types";

export async function logActivity(
  userId: string,
  userName: string,
  userEmail: string,
  action: string,
  entityType: ActivityLog['entityType'],
  entityId: string,
  details: string
): Promise<void> {
  try {
    const colRef = collection(db, "activityLogs");
    await addDoc(colRef, {
      userId,
      userName: userName || "Unknown User",
      userEmail: userEmail || "",
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Failed to write activity log:", error);
  }
}

export async function getRecentActivity(maxCount: number = 20): Promise<ActivityLog[]> {
  try {
    const colRef = collection(db, "activityLogs");
    const q = query(colRef, orderBy("timestamp", "desc"), limit(maxCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ActivityLog));
  } catch (error) {
    console.warn("Failed to retrieve activity logs:", error);
    return [];
  }
}

