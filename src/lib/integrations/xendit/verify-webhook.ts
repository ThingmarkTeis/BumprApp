export function verifyXenditWebhook(request: Request): boolean {
  const callbackToken = request.headers.get("x-callback-token");
  if (!callbackToken) return false;
  return callbackToken === process.env.XENDIT_WEBHOOK_TOKEN;
}
