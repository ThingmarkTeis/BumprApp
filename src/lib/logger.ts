import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level?: LogLevel;
  message: string;
  screen?: string;
  action?: string;
  context?: Record<string, unknown>;
  user_id?: string;
}

async function log(entry: LogEntry) {
  try {
    const supabase = createAdminClient();
    await supabase.from("app_logs").insert({
      level: entry.level ?? "info",
      message: entry.message,
      screen: entry.screen ?? null,
      action: entry.action ?? null,
      context: entry.context ?? {},
      user_id: entry.user_id ?? null,
      device_info: { source: "server" },
    });
  } catch {
    console.error("[logger] Failed to write log:", entry.message);
  }
}

export const logger = {
  info: (message: string, meta?: Omit<LogEntry, "level" | "message">) =>
    log({ level: "info", message, ...meta }),
  warn: (message: string, meta?: Omit<LogEntry, "level" | "message">) =>
    log({ level: "warn", message, ...meta }),
  error: (message: string, meta?: Omit<LogEntry, "level" | "message">) =>
    log({ level: "error", message, ...meta }),
};

// --- Route wrapper: auto-logs errors to app_logs ---

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withLogging(routeName: string, handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const start = Date.now();
    try {
      const response = await handler(request, context);

      // Log server errors (5xx)
      if (response.status >= 500) {
        const body = await response.clone().json().catch(() => ({}));
        await log({
          level: "error",
          message: `${routeName} returned ${response.status}`,
          action: `${request.method} ${routeName}`,
          context: { status: response.status, error: body?.error, duration_ms: Date.now() - start },
        });
      }

      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;

      await log({
        level: "error",
        message: `${routeName} unhandled error: ${message}`,
        action: `${request.method} ${routeName}`,
        context: { stack, duration_ms: Date.now() - start },
      });

      console.error(`${routeName} error:`, err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
