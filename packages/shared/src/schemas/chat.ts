import { z } from "zod";

export const chatQuerySchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  sessionId: z.string().optional(),
  context: z
    .object({
      category: z.string().optional(),
      language: z.string().optional(),
      audience: z.string().optional(),
    })
    .optional(),
});

export type ChatQuery = z.infer<typeof chatQuerySchema>;

export const chatResponseSchema = z.object({
  message: z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    timestamp: z.date(),
  }),
  sources: z
    .array(
      z.object({
        documentId: z.string(),
        documentTitle: z.string(),
        pageNumber: z.number().optional(),
        excerpt: z.string(),
        relevanceScore: z.number().optional(),
      })
    )
    .optional(),
  sessionId: z.string(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

