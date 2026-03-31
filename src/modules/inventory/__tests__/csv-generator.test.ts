import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeCsvField, generateInventoryCsv } from "../csv-generator";

describe("csv-generator", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("escapes CSV fields with commas, quotes, and newlines", () => {
    expect(escapeCsvField("plain")).toBe("plain");
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  describe("CSV injection prevention", () => {
    it.each([
      { input: "=1+1", expected: "'=1+1" },
      { input: "+CALL()", expected: "'+CALL()" },
      { input: "-2+3", expected: "'-2+3" },
      { input: "@SUM(A1)", expected: "'@SUM(A1)" },
      { input: "\t123", expected: "'\t123" },
      { input: "\r123", expected: '"\'\r123"' },
    ])("prevents formula injection: $input", ({ input, expected }) => {
      expect(escapeCsvField(input)).toBe(expected);
    });
  });

  it("generates Excel-compatible CSV with BOM and slugified filename", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00Z"));

    const result = generateInventoryCsv(
      [
        {
          sku: "SKU-1",
          itemName: 'Widget, "Deluxe"',
          category: null as unknown as string,
          unit: "pcs",
          location: "Main\nWarehouse",
          quantity: 12,
          lowStockThreshold: null,
          status: "In Stock",
          lastUpdated: new Date("2026-03-31T08:15:00Z"),
        },
      ],
      "Acme & Co"
    );

    expect(result.filename).toBe("inventory-acme-co-2026-03-31.csv");
    expect(result.rowCount).toBe(1);
    expect(result.content.startsWith("\uFEFF")).toBe(true);
    expect(result.content.slice(1)).toBe(
      [
        "sku,item_name,category,unit,location,quantity,low_stock_threshold,status,last_updated",
        'SKU-1,"Widget, ""Deluxe""",,pcs,"Main\nWarehouse",12,,In Stock,2026-03-31',
      ].join("\n")
    );
  });
});
