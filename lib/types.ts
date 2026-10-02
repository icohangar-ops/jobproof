import type { ProofAid } from "@/lib/jev/types";

export type JobStatus = "open" | "proofed";

export interface Job {
  id: string;
  customerName: string;
  address: string;
  date: string;
  notes: string;
  voiceTranscript: string;
  voiceId: string | null;
  status: JobStatus;
  shareToken: string | null;
  beforeCount: number;
  afterCount: number;
  createdAt: string;
  updatedAt: string;
  /** Decision-aid probabilities. Missing on jobs saved before the aid existed. */
  proofAid?: ProofAid | null;
}

export interface JobDraft {
  customerName: string;
  address?: string;
  date?: string;
}

export interface PhotoRecord {
  id: string;
  jobId: string;
  kind: "before" | "after";
  blob: Blob;
  width: number;
  height: number;
  createdAt: string;
}

export interface VoiceRecord {
  id: string;
  jobId: string;
  blob: Blob;
  durationMs: number;
  createdAt: string;
}

export interface CompanySettings {
  id: "company";
  companyName: string;
  phone: string;
  email: string;
  license: string;
}

export interface PdfPhoto {
  dataUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface ShareSnapshot {
  companyName: string;
  phone: string;
  email: string;
  license: string;
  customerName: string;
  address: string;
  jobDate: string;
  notes: string;
  voiceTranscript: string;
  voiceDataUrl: string | null;
  before: PdfPhoto[];
  after: PdfPhoto[];
  sharedAt: string;
}

export interface ShareRecord {
  token: string;
  jobId: string;
  snapshot: ShareSnapshot;
  createdAt: string;
}

export interface JobProofPdfInput {
  companyName: string;
  phone?: string;
  email?: string;
  license?: string;
  customerName: string;
  address?: string;
  jobDate: string;
  notes?: string;
  voiceTranscript?: string;
  before: PdfPhoto[];
  after: PdfPhoto[];
  generatedAt: string;
  /** Shown when the proof is thin, or when a person overrode the check. */
  decisionAidLine?: string;
}

export const DEFAULT_SETTINGS: CompanySettings = {
  id: "company",
  companyName: "Harbor Lane Services",
  phone: "",
  email: "",
  license: "",
};
