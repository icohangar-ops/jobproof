"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getJob, getSettings, listJobs, removeJob, saveJob, saveSettings } from "@/lib/db";
import { compareJobs, createJobRecord } from "@/lib/jobs";
import { DEFAULT_SETTINGS, type CompanySettings, type Job, type JobDraft } from "@/lib/types";

interface JobStoreValue {
  ready: boolean;
  error: string | null;
  jobs: Job[];
  settings: CompanySettings;
  addJob: (draft: JobDraft) => Promise<Job>;
  updateJob: (id: string, patch: Partial<Job>) => Promise<Job | undefined>;
  deleteJob: (id: string) => Promise<void>;
  updateSettings: (settings: CompanySettings) => Promise<void>;
  refresh: () => Promise<void>;
}

const JobStoreContext = createContext<JobStoreValue | null>(null);

export function JobStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const jobWrite = useRef(Promise.resolve());

  const refresh = useCallback(async () => {
    const [nextJobs, nextSettings] = await Promise.all([listJobs(), getSettings()]);
    setJobs(nextJobs);
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    refresh()
      .then(() => setReady(true))
      .catch(() => {
        setError("This browser blocked on-device storage. JobProof needs IndexedDB for the demo.");
        setReady(true);
      });
  }, [refresh]);

  const addJob = useCallback(async (draft: JobDraft) => {
    const job = createJobRecord(draft);
    await saveJob(job);
    setJobs((current) => [job, ...current].sort(compareJobs));
    return job;
  }, []);

  const updateJob = useCallback(async (id: string, patch: Partial<Job>) => {
    const run = jobWrite.current.then(async () => {
      const current = await getJob(id);
      if (!current) return undefined;
      const next: Job = {
        ...current,
        ...patch,
        id: current.id,
        updatedAt: new Date().toISOString(),
      };
      await saveJob(next);
      setJobs((list) => list.map((job) => (job.id === id ? next : job)).sort(compareJobs));
      return next;
    });
    jobWrite.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    await removeJob(id);
    setJobs((list) => list.filter((job) => job.id !== id));
  }, []);

  const updateSettings = useCallback(async (next: CompanySettings) => {
    const saved = { ...next, id: "company" as const };
    await saveSettings(saved);
    setSettings(saved);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      error,
      jobs,
      settings,
      addJob,
      updateJob,
      deleteJob,
      updateSettings,
      refresh,
    }),
    [ready, error, jobs, settings, addJob, updateJob, deleteJob, updateSettings, refresh],
  );

  return <JobStoreContext.Provider value={value}>{children}</JobStoreContext.Provider>;
}

export function useJobStore() {
  const store = useContext(JobStoreContext);
  if (!store) throw new Error("useJobStore must be used inside JobStoreProvider");
  return store;
}
