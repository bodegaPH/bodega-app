/**
 * CSV Generator for Inventory Export
 */

export interface InventoryExportRow {
  sku: string;
  itemName: string;
  category: string;
  unit: string;
  location: string;
  quantity: number;
  lowStockThreshold: number | null;
  status: "Low Stock" | "In Stock";
  lastUpdated: Date;
}

export interface CsvExportResult {
  filename: string;
  content: string;
  rowCount: number;
}

const CSV_HEADERS = [
  "sku",
  "item_name",
  "category",
  "unit",
  "location",
  "quantity",
  "low_stock_threshold",
  "status",
  "last_updated",
];

/**
 * Generate CSV file content from inventory rows
 */
export function generateInventoryCsv(
  rows: InventoryExportRow[],
  orgName: string
): CsvExportResult {
  const csvRows: string[] = [];

  // Add UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";

  // Header row
  csvRows.push(CSV_HEADERS.join(","));

  // Data rows
  for (const row of rows) {
    const values = [
      escapeCsvField(row.sku),
      escapeCsvField(row.itemName),
      escapeCsvField(row.category),
      escapeCsvField(row.unit),
      escapeCsvField(row.location),
      row.quantity.toString(),
      row.lowStockThreshold?.toString() ?? "",
      escapeCsvField(row.status),
      row.lastUpdated.toISOString().split("T")[0], // YYYY-MM-DD
    ];
    csvRows.push(values.join(","));
  }

  const today = new Date().toISOString().split("T")[0];
  const filename = `inventory-${slugify(orgName)}-${today}.csv`;
  const content = BOM + csvRows.join("\n");

  return { filename, content, rowCount: rows.length };
}

/**
 * Escape CSV field - wrap in quotes if contains special characters
 */
export function escapeCsvField(value: string | null | undefined): string {
  const normalized = value ?? "";

  // CRITICAL: Prevent CSV injection - prefix dangerous chars with apostrophe
  const dangerous = /^[=+\-@\t\r]/;
  let safe = dangerous.test(normalized) ? `'${normalized}` : normalized;

  if (
    safe.includes(",") ||
    safe.includes('"') ||
    safe.includes("\n") ||
    safe.includes("\r")
  ) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Convert text to URL-friendly slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
