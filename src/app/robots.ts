import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://safetoilets.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/verify/"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "CCBot",
        ],
        allow: [
          "/",
          "/toilet/",
          "/toilets/",
          "/about",
          "/faq",
          "/how-it-works",
          "/ratings",
          "/reviews",
          "/reporting",
          "/data-accuracy",
          "/community-guidelines",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: ["/admin", "/api/", "/verify/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
