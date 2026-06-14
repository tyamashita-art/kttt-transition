import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KTTT Transition",
    short_name: "KTTT",
    description: "KTTT members private community app.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F3F5",
    theme_color: "#111217",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
