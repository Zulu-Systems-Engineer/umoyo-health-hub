import { z } from "zod";

export const documentCategorySchema = z.enum([
  "clinical-guideline",
  "drug-info",
  "disease-reference",
  "patient-education",
]);

export const documentLanguageSchema = z.enum(["en", "ny", "bem"]);

export const documentAudienceSchema = z.enum([
  "healthcare-professional",
  "patient",
  "both",
]);

export const documentRegionSchema = z.enum([
  "zambia",
  "southern-africa",
  "global",
]);

export const documentMetadataSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  category: documentCategorySchema,
  language: documentLanguageSchema,
  audience: documentAudienceSchema,
  region: documentRegionSchema,
  lastUpdated: z.string(), // ISO date string
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

