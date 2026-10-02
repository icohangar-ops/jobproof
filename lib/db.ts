import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { compareJobs } from "@/lib/jobs";
import { DEFAULT_SETTINGS, type CompanySettings, type Job, type PhotoRecord, type ShareRecord, type VoiceRecord } from "@/lib/types";

interface JobProofSchema extends DBSchema {
  jobs: { key: string; value: Job };
  photos: {
    key: string;
    value: PhotoRecord;
    indexes: { "by-job": string };
  };
  voices: { key: string; value: VoiceRecord };
  shares: { key: string; value: ShareRecord };
  settings: { key: string; value: CompanySettings };
}

const DB_NAME = "jobproof";
const DB_VERSION = 1;

let database: Promise<IDBPDatabase<JobProofSchema>> | null = null;

function getDb() {
  if (!database) {
    database = openDB<JobProofSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("jobs", { keyPath: "id" });
        const photos = db.createObjectStore("photos", { keyPath: "id" });
        photos.createIndex("by-job", "jobId");
        db.createObjectStore("voices", { keyPath: "id" });
        db.createObjectStore("shares", { keyPath: "token" });
        db.createObjectStore("settings", { keyPath: "id" });
      },
    }).catch((error) => {
      database = null;
      throw error;
    });
  }
  return database;
}

export async function listJobs(): Promise<Job[]> {
  const db = await getDb();
  const jobs = await db.getAll("jobs");
  return jobs.sort(compareJobs);
}

export async function getJob(id: string): Promise<Job | undefined> {
  const db = await getDb();
  return db.get("jobs", id);
}

export async function saveJob(job: Job): Promise<void> {
  const db = await getDb();
  await db.put("jobs", job);
}

export async function removeJob(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["jobs", "photos", "voices", "shares"], "readwrite");
  const job = await tx.objectStore("jobs").get(id);
  const photos = await tx.objectStore("photos").index("by-job").getAll(id);
  await Promise.all(photos.map((photo) => tx.objectStore("photos").delete(photo.id)));
  if (job?.voiceId) await tx.objectStore("voices").delete(job.voiceId);
  if (job?.shareToken) await tx.objectStore("shares").delete(job.shareToken);
  await tx.objectStore("jobs").delete(id);
  await tx.done;
}

export async function getSettings(): Promise<CompanySettings> {
  const db = await getDb();
  const saved = await db.get("settings", "company");
  return saved ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: CompanySettings): Promise<void> {
  const db = await getDb();
  await db.put("settings", { ...settings, id: "company" });
}

export async function listPhotos(jobId: string): Promise<PhotoRecord[]> {
  const db = await getDb();
  const photos = await db.getAllFromIndex("photos", "by-job", jobId);
  return photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function savePhoto(photo: PhotoRecord): Promise<void> {
  const db = await getDb();
  await db.put("photos", photo);
}

export async function removePhoto(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("photos", id);
}

export async function getVoice(id: string): Promise<VoiceRecord | undefined> {
  const db = await getDb();
  return db.get("voices", id);
}

export async function saveVoice(voice: VoiceRecord): Promise<void> {
  const db = await getDb();
  await db.put("voices", voice);
}

export async function removeVoice(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("voices", id);
}

export async function getShare(token: string): Promise<ShareRecord | undefined> {
  const db = await getDb();
  return db.get("shares", token);
}

export async function saveShare(record: ShareRecord): Promise<void> {
  const db = await getDb();
  await db.put("shares", record);
}
