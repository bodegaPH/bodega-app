/**
 * Indicators Module - Type Definitions
 */

export interface LowStockItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  currentQty: number;
  threshold: number;
  locationName: string;
}

export interface LargeOutboundItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  locationName: string;
  issuedQty: number;
  currentQty: number; // Current stock level (not historical)
  issuedAt: Date;
  percentOfStock: number; // Percentage of current stock
}

export interface FrequentAdjustmentItem {
  itemId: string;
  sku: string;
  name: string;
  adjustmentCount: number;
  firstAdjustment: Date;
  lastAdjustment: Date;
}

export interface InventoryIndicators {
  lowStock: LowStockItem[];
  largeOutbound: LargeOutboundItem[];
  frequentAdjustments: FrequentAdjustmentItem[];
}
