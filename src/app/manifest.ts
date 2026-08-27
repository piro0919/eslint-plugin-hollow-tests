import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#18181b",
    display: "standalone",
    icons: [
      { purpose: "any", sizes: "any", src: "/icon.svg", type: "image/svg+xml" },
      { sizes: "180x180", src: "/apple-icon", type: "image/png" },
    ],
    name: "eslint-plugin-hollow-tests",
    orientation: "portrait",
    short_name: "hollow-tests",
    start_url: "/",
    theme_color: "#18181b",
  };
}
