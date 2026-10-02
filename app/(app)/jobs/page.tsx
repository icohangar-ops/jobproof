import type { Metadata } from "next";
import { JobsHome } from "@/components/jobs-home";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return <JobsHome />;
}
