"use client";

import { useState } from "react";
import { Download } from "lucide-react";
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
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
