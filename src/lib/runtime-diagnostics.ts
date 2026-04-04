import { createHash } from "node:crypto";

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function getDatabaseRuntimeSummary() {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    return {
      configured: false,
      fingerprint: null,
      host: null,
      port: null,
      database: null,
    };
  }

  try {
    const parsed = new URL(raw);
    return {
      configured: true,
      fingerprint: fingerprint(raw),
      host: parsed.hostname || null,
      port: parsed.port || null,
      database: parsed.pathname.replace(/^\//, "") || null,
    };
  } catch {
    return {
      configured: true,
      fingerprint: fingerprint(raw),
      host: "invalid",
      port: null,
      database: null,
    };
  }
}

export function serializeRuntimeError(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & {
      cause?: unknown;
      code?: string;
      detail?: string;
      hint?: string;
      table?: string;
      schema?: string;
      severity_local?: string;
      routine?: string;
    };

    return {
      name: candidate.name,
      message: candidate.message,
      code: candidate.code ?? null,
      detail: candidate.detail ?? null,
      hint: candidate.hint ?? null,
      table: candidate.table ?? null,
      schema: candidate.schema ?? null,
      severity: candidate.severity_local ?? null,
      routine: candidate.routine ?? null,
      cause:
        candidate.cause instanceof Error
          ? {
              name: candidate.cause.name,
              message: candidate.cause.message,
            }
          : candidate.cause ?? null,
    };
  }

  return {
    value: error,
  };
}
