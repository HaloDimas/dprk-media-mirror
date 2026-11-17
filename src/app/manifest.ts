import type { MetadataRoute } from "next";

// Minimal PWA manifest (no service worker — deliberately out of scope, so
// the site does not cache anything offline).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DPRK Media Mirror",
    short_name: "DPRK Mirror",
    description:
      "Live KCTV, radio, programme guides, news, recordings and publications from North Korean state media — mirrored on one site.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
