/**
 * Search Router
 * Handles document search functionality
 */

import { router, publicProcedure } from '../router';
import { searchParamsSchema } from '@umoyo/shared';
import { ragService } from '../services/rag.service';
import type { SearchContext, SearchOptions } from '../services/rag.service';

export const searchRouter: ReturnType<typeof router> = router({
  /**
   * Search documents in the RAG corpus
   */
  search: publicProcedure
    .input(searchParamsSchema)
    .query(async ({ input }) => {
      try {
        const { query, category, language, audience, region, limit, offset } = input;

        // Build search context
        const context: SearchContext | undefined =
          category || language || audience || region
            ? {
                category: category as any,
                language: language as any,
                audience: audience as any,
                region: region as any,
              }
            : undefined;

        // Build search options
        const options: SearchOptions = {
          limit: limit || 20,
          offset: offset || 0,
        };

        // Perform search
        const results = await ragService.searchDocuments(query, context, options);

        return {
          results,
          totalResults: results.length,
          query,
          filters: {
            category,
            language,
            audience,
            region,
          },
        };
      } catch (error: any) {
        console.error('[Search Router] Error searching:', error);
        throw new Error(`Search failed: ${error.message}`);
      }
    }),

  /**
   * Get available filters/categories
   */
  getFilters: publicProcedure.query(async () => {
    return {
      categories: ['clinical-guideline', 'drug-info', 'disease-reference', 'patient-education'],
      languages: ['en', 'ny', 'bem'],
      audiences: ['healthcare-professional', 'patient', 'both'],
      regions: ['zambia', 'southern-africa', 'global'],
    };
  }),

  /**
   * Get corpus statistics
   */
  getStats: publicProcedure.query(async () => {
    try {
      const stats = await ragService.getCorpusStats();
      return stats;
    } catch (error: any) {
      console.error('[Search Router] Error getting stats:', error);
      throw new Error(`Failed to get corpus stats: ${error.message}`);
    }
  }),
});
