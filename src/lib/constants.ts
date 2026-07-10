import type { BrandAssets } from "./types";

export const DEMO_BRAND: BrandAssets = {
  domain: "acme.com",
  name: "ACME",
  description: "Real-time web data for modern teams.",
  slogan: null,
  logoUrl: null,
  primaryColor: "#2663ec",
  darkColor: "#0a2540",
  colors: [{ hex: "#2663ec", name: "Blue" }],
  logos: [],
  backdrops: [],
  socials: 0,
  creditsConsumed: null,
  creditsRemaining: null,
};

export const EXAMPLE_DOMAINS = ["stripe.com", "linear.app", "notion.so", "vercel.com"];

export const AD_EXAMPLES = [
  "/ad-examples/stripe.png",
  "/ad-examples/linear.png",
  "/ad-examples/notion.png",
  "/ad-examples/vercel.png",
  "/ad-examples/openai.png",
  "/ad-examples/webflow.png",
];

export const MARQUEE_BRANDS: { name: string; domain: string }[] = [
  { name: "Stripe", domain: "stripe.com" },
  { name: "Linear", domain: "linear.app" },
  { name: "Notion", domain: "notion.so" },
  { name: "Vercel", domain: "vercel.com" },
  { name: "OpenAI", domain: "openai.com" },
  { name: "Figma", domain: "figma.com" },
  { name: "Framer", domain: "framer.com" },
  { name: "Anthropic", domain: "anthropic.com" },
  { name: "GitHub", domain: "github.com" },
  { name: "Shopify", domain: "shopify.com" },
  { name: "Ramp", domain: "ramp.com" },
  { name: "Loom", domain: "loom.com" },
];
