export default function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-volcanic/10 rounded-lg ${className ?? "h-4 w-full"}`}
    />
  );
}
