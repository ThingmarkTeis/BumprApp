const XENDIT_BASE_URL = "https://api.xendit.co";

export async function xenditRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
  } = {}
): Promise<T> {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) throw new Error("XENDIT_SECRET_KEY is not set.");

  const response = await fetch(`${XENDIT_BASE_URL}${path}`, {
    method: options.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Xendit API error (${response.status}): ${data.message ?? JSON.stringify(data)}`
    );
  }

  return data as T;
}
