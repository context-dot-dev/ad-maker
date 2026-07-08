import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBrand, scrapePage } from "@/lib/context";

const schema = z.object({ url: z.string().url() });

function parseDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid URL." }, { status: 400 });
  }

  const { url } = parsed.data;
  const domain = parseDomain(url);

  const [brandResult, pageResult] = await Promise.allSettled([
    fetchBrand(domain),
    scrapePage(url),
  ]);

  if (brandResult.status === "rejected") {
    return NextResponse.json(
      { error: "Couldn't load brand data for that domain. Try another URL." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    brand: brandResult.value,
    pageMarkdown: pageResult.status === "fulfilled" ? pageResult.value : "",
    error: null,
  });
}
