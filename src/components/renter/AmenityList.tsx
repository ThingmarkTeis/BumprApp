import { AMENITIES } from "@/lib/amenities";

export default function AmenityList({ amenities }: { amenities: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      {amenities.map((key) => {
        const a = AMENITIES[key];
        return (
          <div key={key} className="flex items-center gap-2.5 text-volcanic">
            <span className="text-warm-gray-dark">{a?.icon ?? null}</span>
            <span className="text-sm">{a?.label ?? key}</span>
          </div>
        );
      })}
    </div>
  );
}
