import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ villaId: string }> }
) {
  const { villaId } = await params;
  const supabase = createAdminClient();

  // Verify villa exists
  const { data: villa } = await supabase
    .from("villas")
    .select("id")
    .eq("id", villaId)
    .single<{ id: string }>();

  if (!villa) {
    return new Response("Villa not found", { status: 404 });
  }

  // Get active and bumped bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("villa_id", villaId)
    .in("status", ["active", "bumped"])
    .returns<Booking[]>();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const events: string[] = [];

  for (const booking of bookings ?? []) {
    // Per BIBLE.md §5: outbound iCal shows real-time occupancy only
    // Block from today (or check-in, whichever later) to tomorrow + 1 day
    // For bumped: block current night + next night
    const checkIn = booking.check_in;
    const blockStart = checkIn > todayStr ? checkIn : todayStr;

    let blockEnd: string;
    if (booking.status === "bumped") {
      // Block current night + next night (renter has 18hr to leave)
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 2);
      blockEnd = endDate.toISOString().split("T")[0];
    } else {
      // Active: block current night + 20 hours ahead (18hr bump notice + 2hr buffer)
      // Simplified: block today + next day
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 2);
      // But don't extend past checkout
      const maxEnd = booking.check_out;
      blockEnd = endDate.toISOString().split("T")[0] < maxEnd
        ? endDate.toISOString().split("T")[0]
        : maxEnd;
    }

    // Don't generate events for past dates
    if (blockEnd <= todayStr) continue;

    const dtstart = blockStart.replace(/-/g, "");
    const dtend = blockEnd.replace(/-/g, "");

    events.push(
      [
        "BEGIN:VEVENT",
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        `SUMMARY:Bumpr Standby Guest`,
        `UID:booking-${booking.id}@bumpr.rent`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        "END:VEVENT",
      ].join("\r\n")
    );
  }

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bumpr//Standby Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="bumpr-${villaId}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
