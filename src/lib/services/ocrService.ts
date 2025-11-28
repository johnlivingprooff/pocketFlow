// Optional OCR service using expo-text-recognition (placeholder)
// In production, consider handling permissions and feature flags.
export interface OcrSuggestion {
  amount?: number;
  shop?: string;
}

export async function extractOcrSuggestions(_imageUri: string): Promise<OcrSuggestion> {
  // Placeholder: integrate expo-text-recognition or a server-side OCR.
  return {};
}
