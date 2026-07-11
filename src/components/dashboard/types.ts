export interface ProductCustomField {
  id: string;
  fieldName: string;
  fieldValue: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sku?: string;
  imageUrl?: string;
  videoUrl?: string;
  additionalImages?: string[];
  active: boolean;
  customFields?: ProductCustomField[];
  sortOrder?: number;
  categoryId?: string; // Deprecated - kept for backward compatibility
  categoryIds?: string[]; // New: multiple categories support
}
