"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";

function preferredMime() {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export function VoiceRecorder({
  audioUrl,
  durationMs,
  onSave,
  onClear,
}: {
  audioUrl: string | null;
  durationMs: number;
  onSave: (blob: Blob, durationMs: number) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedRef.current);
    }, 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("This browser cannot record audio. Type the note instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = preferredMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const duration = Date.now() - startedRef.current;
        setBusy(true);
        try {
          if (blob.size > 0) await onSave(blob, duration);
        } catch {
          toast.error("Could not save the voice note.");
        } finally {
          setBusy(false);
          setRecording(false);
        }
      };
      recorderRef.current = recorder;
      startedRef.current = Date.now();
      setElapsed(0);
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone is blocked. You can still type the note.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {recording ? (
          <Button type="button" size="xl" variant="destructive" onClick={stop} disabled={busy}>
            <Square />
            Stop · {formatDuration(elapsed)}
          </Button>
        ) : (
          <Button type="button" size="xl" onClick={start} disabled={busy}>
            <Mic />
            {audioUrl ? "Record again" : "Record a voice note"}
          </Button>
        )}
        {audioUrl && !recording ? (
          <Button type="button" size="lg" variant="outline" onClick={onClear} disabled={busy}>
            Remove audio
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {recording
          ? "Recording. Tap stop when the note is done."
          : audioUrl
            ? `Saved on this device · ${formatDuration(durationMs)}`
            : "Optional. About half a minute is plenty. Speech is not transcribed automatically."}
      </p>
      {audioUrl && !recording ? <audio controls src={audioUrl} className="w-full" /> : null}
    </div>
  );
}
