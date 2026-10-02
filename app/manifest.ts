import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobProof",
    short_name: "JobProof",
    description: "Prove the work and get paid — for coffee money.",
    start_url: "/jobs",
    scope: "/",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#1c1612",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
