export default function ActivityItem({
  icon,
  text,
  time,
}: {
  icon: string;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-volcanic">{text}</p>
        <p className="text-xs text-volcanic/40 mt-0.5">{time}</p>
      </div>
    </div>
  );
}
