import { z } from "zod";

export const searchParamsSchema = z.object({
  query: z.string().min(1, "Search query cannot be empty"),
  category: z.string().optional(),
  language: z.string().optional(),
  audience: z.string().optional(),
  region: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export const searchResultSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  excerpt: z.string(),
  relevanceScore: z.number(),
  metadata: z.object({
    category: z.string(),
    language: z.string(),
    lastUpdated: z.string(),
  }),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

