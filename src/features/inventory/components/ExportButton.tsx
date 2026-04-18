"use client";

import { useState } from "react";
import { DownloadIcon as Download } from "@radix-ui/react-icons";
import Button from "@/components/ui/Button";
import { exportInventoryCsv } from "@/features/inventory/actions/export-inventory";
import { useOrg } from "@/features/shared/OrgContext";

export function ExportButton() {
  const { orgId } = useOrg();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportInventoryCsv(orgId);

      if (!result.success) {
        alert(result.error);
        return;
      }

      // Trigger download
      const blob = new Blob([result.data.content], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      link.click();
      URL.revokeObjectURL(url);

      // Success feedback
      alert(`✓ Exported ${result.data.rowCount} items`);
    } catch {
      alert("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2 uppercase text-[10px]"
    >
      <Download className="h-3.5 w-3.5" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
