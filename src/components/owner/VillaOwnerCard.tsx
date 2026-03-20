import Link from "next/link";
import { formatIdr } from "@/lib/utils/currency";

interface VillaOwnerCardProps {
  id: string;
  title: string;
  area: string;
  standbyRateIdr: number;
  heroPhotoUrl: string | null;
  icalSyncStatus: string;
  activeBookingStatus: "guest_staying" | "bump_in_progress" | "no_guest";
}

export default function VillaOwnerCard({
  id,
  title,
  area,
  standbyRateIdr,
  heroPhotoUrl,
  icalSyncStatus,
  activeBookingStatus,
}: VillaOwnerCardProps) {
  const statusText = {
    guest_staying: "1 guest staying",
    bump_in_progress: "Bump in progress",
    no_guest: "No current guest",
  };

  const statusColor = {
    guest_staying: "text-teal",
    bump_in_progress: "text-bumpr-orange",
    no_guest: "text-warm-gray",
  };

  return (
    <Link
      href={`/villa/${id}/manage`}
      className="block rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-32 bg-volcanic/5">
        {heroPhotoUrl ? (
          <img
            src={heroPhotoUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-volcanic/20 text-4xl">
            ⌂
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-serif font-semibold text-volcanic">{title}</h3>
            <p className="text-sm text-warm-gray-dark capitalize">{area}</p>
          </div>
          <span
            className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
              icalSyncStatus === "ok"
                ? "bg-teal"
                : icalSyncStatus === "error"
                  ? "bg-bumpr-orange"
                  : "bg-warm-gray-light"
            }`}
            title={`iCal: ${icalSyncStatus}`}
          />
        </div>
        <p className="mt-2 font-mono text-sm text-bumpr-orange">
          {formatIdr(standbyRateIdr)}
          <span className="text-warm-gray"> / night</span>
        </p>
        <p className={`mt-2 text-sm font-medium ${statusColor[activeBookingStatus]}`}>
          {statusText[activeBookingStatus]}
        </p>
      </div>
    </Link>
  );
}
