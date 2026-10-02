import type { Metadata } from "next";
import { ShareReport } from "@/components/share-report";

export const metadata: Metadata = {
  title: "Shared proof",
  robots: { index: false, follow: false },
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ShareReport token={token} />;
}
