import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "אבא חטוב — ניהול הרכב גוף",
    short_name: "אבא חטוב",
    description:
      "מעקב צום לסירוגין, קלוריות, מאקרו ומדידות גוף. כל הנתונים נשמרים במכשיר שלך.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "he",
    dir: "rtl",
    background_color: "#fafaf8",
    theme_color: "#1d8660",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "רישום אכילה", short_name: "רישום", url: "/log" },
      { name: "התקדמות", short_name: "מדדים", url: "/progress" },
    ],
  };
}
