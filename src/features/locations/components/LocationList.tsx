"use client";

import { useState } from "react";
import { MoreHorizontal, Star, MapPin, Edit2, Trash2, CheckCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/src/components/ui/Button";
import LocationForm from "./LocationForm";
import LocationDeleteDialog from "./LocationDeleteDialog";

type LocationRecord = {
  id: string;
  name: string;
  isDefault: boolean;
};

interface LocationListProps {
  initialLocations: LocationRecord[];
}

export default function LocationList({ initialLocations }: LocationListProps) {
  const [locations, setLocations] = useState(initialLocations);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LocationRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocationRecord | null>(null);
  const [inlineError, setInlineError] = useState("");
  const router = useRouter();

  async function reloadLocations() {
    const response = await fetch("/api/locations", { cache: "no-store" });

    if (response.status === 401) {
      window.location.assign("/auth/signin");
      return;
    }

    const data = (await response.json().catch(() => ({}))) as {
      locations?: LocationRecord[];
      error?: string;
    };

    if (response.status === 403) {
      setInlineError(data.error ?? "You do not have access to this organization");
      return;
    }

    if (!response.ok) {
      setInlineError(data.error ?? "Unable to load locations");
      return;
    }

    setLocations(data.locations ?? []);
    setInlineError("");
    router.refresh();
  }

  async function handleSetDefault(locationId: string) {
    setInlineError("");

    const response = await fetch(`/api/locations/${locationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });

    if (response.status === 401) {
      window.location.assign("/auth/signin");
      return;
    }

    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (response.status === 403) {
      setInlineError(data.error ?? "You do not have access to this organization");
      return;
    }

    if (!response.ok) {
      setInlineError(data.error ?? "Unable to set default location");
      return;
    }

    await reloadLocations();
  }

  return (
    <>
      <div className="rounded-lg bg-zinc-900/30 backdrop-blur-xl border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Locations</h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              Manage warehouses, shelves, and bins for your organization.
            </p>
          </div>
          <Button 
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-none border-0 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Location
          </Button>
        </div>

        {inlineError && (
          <div className="mt-6 rounded-md border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            {inlineError}
          </div>
        )}

        <div className="mt-8">
          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-white/10 rounded-lg bg-white/[0.01]">
              <div className="h-14 w-14 rounded-md bg-blue-500/10 flex items-center justify-center mb-5 border border-blue-500/20">
                <MapPin className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-200 tracking-tight mb-2">No locations found</h3>
              <p className="text-sm text-zinc-500 mb-8 max-w-sm leading-relaxed">
                Get started by creating your first location to track inventory, shelves, and bins.
              </p>
              <Button 
                onClick={() => setCreateOpen(true)}
                className="rounded-md border border-white/5 bg-white/5 hover:bg-white/10 text-white shadow-none"
              >
                Create First Location
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {locations.map((location) => (
                <div 
                  key={location.id} 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-900 border border-white/5 group-hover:bg-zinc-800/80 transition-colors">
                      <MapPin className="h-5 w-5 text-zinc-400 group-hover:text-zinc-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-zinc-200 text-base">{location.name}</h3>
                        {location.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                            <Star className="h-3 w-3 fill-blue-400 text-blue-400" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 font-mono tracking-tight">ID: {location.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 justify-end">
                    {!location.isDefault && (
                      <button 
                        onClick={() => handleSetDefault(location.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-md transition-colors border border-transparent hover:border-white/5"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Make Default</span>
                      </button>
                    )}
                    <button 
                      onClick={() => setEditTarget(location)}
                      className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-md transition-colors border border-transparent hover:border-white/5"
                      title="Edit location"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteTarget(location)}
                      className="p-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors border border-transparent hover:border-rose-500/20"
                      title="Delete location"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LocationForm
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSuccess={reloadLocations}
      />

      <LocationForm
        open={Boolean(editTarget)}
        mode="edit"
        location={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
        onSuccess={reloadLocations}
      />

      <LocationDeleteDialog
        open={Boolean(deleteTarget)}
        location={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={reloadLocations}
      />
    </>
  );
}
