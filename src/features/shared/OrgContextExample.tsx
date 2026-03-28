"use client";

import { useOrg } from "@/features/shared/OrgContext";

/**
 * Example component demonstrating useOrg() hook usage.
 * This can be used in real-time collaboration features.
 * 
 * Remove this file once you have actual features using the hook.
 */
export default function OrgContextExample() {
  const { orgId, userId } = useOrg();

  return (
    <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
      <h3 className="text-sm font-medium text-zinc-300 mb-2">
        Org Context (from useOrg hook)
      </h3>
      <dl className="space-y-1 text-xs">
        <div className="flex gap-2">
          <dt className="text-zinc-500">Org ID:</dt>
          <dd className="font-mono text-zinc-300">{orgId}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-zinc-500">User ID:</dt>
          <dd className="font-mono text-zinc-300">{userId}</dd>
        </div>
      </dl>
    </div>
  );
}
