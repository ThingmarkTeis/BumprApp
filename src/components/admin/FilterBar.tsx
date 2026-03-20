"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
}

export default function FilterBar({
  filters,
  searchKey,
  searchPlaceholder,
}: {
  filters: FilterDef[];
  searchKey?: string;
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // Reset page on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={searchParams.get(filter.key) ?? "all"}
          onChange={(e) => updateParam(filter.key, e.target.value)}
          className="rounded-lg border border-volcanic/20 bg-white px-3 py-2 text-sm text-volcanic"
        >
          <option value="all">{filter.label}: All</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {searchKey && (
        <input
          type="text"
          placeholder={searchPlaceholder ?? "Search..."}
          defaultValue={searchParams.get(searchKey) ?? ""}
          onChange={(e) => updateParam(searchKey, e.target.value)}
          className="rounded-lg border border-volcanic/20 bg-white px-3 py-2 text-sm text-volcanic placeholder:text-volcanic/40 w-48"
        />
      )}
    </div>
  );
}
