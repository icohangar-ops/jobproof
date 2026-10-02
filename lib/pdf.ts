import { jsPDF } from "jspdf";
import { formatLongDate, formatTimestamp } from "@/lib/format";
import type { JobProofPdfInput, PdfPhoto } from "@/lib/types";

const INK: [number, number, number] = [28, 22, 18];
const AMBER: [number, number, number] = [176, 104, 24];
const CREAM: [number, number, number] = [244, 239, 230];
const MUTED: [number, number, number] = [96, 84, 72];
const PAPER: [number, number, number] = [247, 242, 234];

function imageFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.includes("image/png") ? "PNG" : "JPEG";
}

export function buildJobProofPdf(
  input: JobProofPdfInput,
  options?: { compress?: boolean },
): Uint8Array {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: options?.compress ?? true,
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const company = input.companyName.trim() || "JobProof";

  doc.setProperties({
    title: `JobProof — ${input.customerName}`,
    subject: "Proof of work",
    creator: "JobProof",
    author: company,
  });

  const paintContinuation = () => {
    doc.setFillColor(...INK);
    doc.rect(0, 0, pageW, 10, "F");
    doc.setTextColor(...CREAM);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("JobProof", margin, 6.5);
    doc.setFont("helvetica", "normal");
    const who = doc.splitTextToSize(input.customerName, 90)[0] ?? input.customerName;
    doc.text(who, pageW - margin, 6.5, { align: "right" });
    return 18;
  };

  const newPage = () => {
    doc.addPage();
    return paintContinuation();
  };

  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, 34, "F");
  doc.setFillColor(...AMBER);
  doc.rect(0, 34, pageW, 1.8, "F");
  doc.setTextColor(...CREAM);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  const companyLines = doc.splitTextToSize(company, 120);
  doc.text(companyLines[0] ?? company, margin, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(236, 196, 122);
  doc.text("PROOF OF WORK", margin, 23);
  const contact = [input.phone?.trim(), input.email?.trim()].filter(Boolean).join("   ·   ");
  if (contact) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(214, 204, 190);
    doc.text(doc.splitTextToSize(contact, 120)[0] ?? contact, margin, 29);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(214, 204, 190);
  doc.text("Generated", pageW - margin, 14, { align: "right" });
  doc.text(formatTimestamp(input.generatedAt), pageW - margin, 19, { align: "right" });

  let y = 46;
  doc.setTextColor(...INK);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  const title = doc.splitTextToSize(input.customerName, contentW);
  doc.text(title, margin, y);
  y += title.length * 8 + 1;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(input.address?.trim() || "Address not listed", margin, y);
  y += 6;
  doc.text(`Job date   ${formatLongDate(input.jobDate)}`, margin, y);
  y += 6;
  if (input.license?.trim()) {
    doc.setFontSize(9);
    doc.text(input.license.trim(), margin, y);
    y += 6;
  }
  y += 2;

  const aidLine = input.decisionAidLine?.trim();
  if (aidLine) {
    const banner: string[] = doc.splitTextToSize(aidLine, contentW - 8);
    const rectH = banner.length * 4.2 + 6;
    if (y + rectH > pageH - 20) y = newPage();
    doc.setFillColor(244, 232, 214);
    doc.roundedRect(margin, y, contentW, rectH, 1.4, 1.4, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...AMBER);
    doc.text(banner, margin + 4, y + 4.6);
    y += rectH + 5;
  }

  const drawSection = (label: string, body: string | undefined) => {
    const text = body?.trim() ?? "";
    if (!text) return;
    const lines: string[] = doc.splitTextToSize(text, contentW - 8);
    if (y > pageH - 30) y = newPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...AMBER);
    doc.text(label.toUpperCase(), margin, y);
    y += 3.5;

    let index = 0;
    while (index < lines.length) {
      const room = pageH - 18 - y;
      const fit = Math.max(1, Math.floor((room - 8) / 4.7));
      const slice = lines.slice(index, index + fit);
      const rectH = slice.length * 4.7 + 8;
      if (y + rectH > pageH - 16) {
        y = newPage();
        continue;
      }
      doc.setFillColor(...PAPER);
      doc.roundedRect(margin, y, contentW, rectH, 1.6, 1.6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
      doc.text(slice, margin + 4, y + 6);
      y += rectH + 5;
      index += slice.length;
    }
  };

  drawSection("Notes", input.notes);
  drawSection("From the voice note", input.voiceTranscript);

  const drawPhotos = (label: string, photos: PdfPhoto[]) => {
    if (y > pageH - 28) y = newPage();
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(label, margin, y);
    y += 2.5;
    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.7);
    doc.line(margin, y, margin + 24, y);
    y += 6;

    if (photos.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text("No photos in this set.", margin, y);
      y += 10;
      return;
    }

    for (const photo of photos) {
      const ratio =
        photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 4 / 3;
      let width = contentW;
      let height = width / ratio;
      const maxH = 92;
      if (height > maxH) {
        height = maxH;
        width = height * ratio;
      }
      if (y + height + 10 > pageH - 16) y = newPage();
      const x = margin + (contentW - width) / 2;
      try {
        doc.addImage(photo.dataUrl, imageFormat(photo.dataUrl), x, y, width, height);
        y += height + 4;
      } catch {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        doc.text("A photo could not be embedded.", margin, y + 4);
        y += 10;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(formatTimestamp(photo.createdAt), margin, y);
      y += 8;
    }
  };

  drawPhotos("Before", input.before);
  drawPhotos("After", input.after);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220, 210, 196);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "JobProof  ·  Prove the work and get paid  ·  Not an invoice",
      margin,
      pageH - 7,
    );
    doc.text(`${page} / ${pages}`, pageW - margin, pageH - 7, { align: "right" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
