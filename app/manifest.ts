import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KTTT Transition",
    short_name: "KTTT",
    description: "KTTT members private community app.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#0F172A",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
