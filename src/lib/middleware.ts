import { NextResponse } from "next/server";
import { checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export function rateLimitMiddleware(
  request: NextRequest,
  identifier: string,
  config?: { maxRequests?: number; windowMs?: number }
): NextResponse | null {
  const rateLimit = checkRateLimit(identifier, config);

  if (!rateLimit.success) {
    const headers = createRateLimitHeaders(
      rateLimit.remaining,
      rateLimit.reset,
      rateLimit.limit
    );
    
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429, headers }
    );
  }

  return null;
}
