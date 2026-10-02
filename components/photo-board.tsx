"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PhotoRecord } from "@/lib/types";

const MAX_PHOTOS = 8;

export function PhotoBoard({
  kind,
  photos,
  urls,
  badges,
  onAdd,
  onRemove,
}: {
  kind: "before" | "after";
  photos: PhotoRecord[];
  urls: Record<string, string>;
  badges?: Record<string, string>;
  onAdd: (file: File) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const label = kind === "before" ? "Before" : "After";

  async function takeFiles(list: FileList | null) {
    if (!list?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`This ${label.toLowerCase()} set already has ${MAX_PHOTOS} photos.`);
      return;
    }
    const files = Array.from(list).slice(0, room);
    setBusy(true);
    try {
      for (const file of files) {
        await onAdd(file);
      }
      if (list.length > room) {
        toast.message(`Kept ${room} photo${room === 1 ? "" : "s"}. ${MAX_PHOTOS} is the limit.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add that photo.";
      toast.error(message);
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl">{label}</h2>
        <span className="text-sm text-muted-foreground">
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </span>
      </div>
      {photos.length === 0 ? (
        <p className="mb-4 rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No {label.toLowerCase()} photos yet. Use the camera on site, or pick one from the library.
        </p>
      ) : (
        <ul className="mb-4 grid grid-cols-2 gap-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative overflow-hidden rounded-xl bg-muted">
              {urls[photo.id] ? (
                // Blob URLs cannot go through next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[photo.id]}
                  alt={`${label} photo ${index + 1}`}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[4/3] animate-pulse bg-muted" />
              )}
              {badges?.[photo.id] ? (
                <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground">
                  {badges[photo.id]}
                </span>
              ) : null}
              <button
                type="button"
                className="absolute top-2 right-2 grid size-11 place-items-center rounded-full bg-foreground/85 text-background"
                aria-label={`Remove ${label.toLowerCase()} photo ${index + 1}`}
                onClick={() => onRemove(photo.id)}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          size="xl"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera />
          {busy ? "Saving…" : `Camera · ${label.toLowerCase()}`}
        </Button>
        <Button
          type="button"
          size="xl"
          variant="outline"
          disabled={busy}
          onClick={() => libraryRef.current?.click()}
        >
          <ImagePlus />
          Upload
        </Button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label={`${label} camera`}
        onChange={(event) => takeFiles(event.target.files)}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label={`${label} library`}
        onChange={(event) => takeFiles(event.target.files)}
      />
    </section>
  );
}
