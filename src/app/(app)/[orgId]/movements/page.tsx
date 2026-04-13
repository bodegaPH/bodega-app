import { MovementFilters, MovementList } from "@/features/movements";
import { getMovements } from "@/features/movements/server";
import { getItems } from "@/features/items/server";
import { getLocations } from "@/features/locations/server";
import type { MovementDTO } from "@/features/movements/server";

interface PageProps {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Parse an ISO date string and return a Date only if it is valid. */
function parseDateParam(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

/** Parse an integer page param, falling back to `fallback` for invalid input. */
function parsePageParam(value: unknown, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

export default async function MovementsPage({
  params,
  searchParams,
}: PageProps) {
  const { orgId } = await params;
  const queryParams = await searchParams;

  const itemId =
    typeof queryParams.itemId === "string" ? queryParams.itemId : undefined;
  const locationId =
    typeof queryParams.locationId === "string" ? queryParams.locationId : undefined;
  const from = parseDateParam(queryParams.from);
  const to = parseDateParam(queryParams.to);
  const page = parsePageParam(queryParams.page, 1);
  const limit = 50;

  const [movementsData, items, locations] = await Promise.all([
    getMovements(orgId, { itemId, locationId, from, to, page, limit }),
    getItems(orgId),
    getLocations(orgId),
  ]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Movement History
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            View the complete immutable ledger of all stock movements.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="w-full">
            <MovementFilters items={items} locations={locations} />
          </div>

          <div className="w-full">
            <MovementList
              movements={movementsData.movements as MovementDTO[]}
              pagination={movementsData.pagination}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
