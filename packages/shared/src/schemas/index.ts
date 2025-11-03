// Export Zod schemas
export {
  chatQuerySchema,
  chatResponseSchema,
} from "./chat";
export {
  userRoleSchema,
  userProfileSchema,
} from "./user";
export {
  documentCategorySchema,
  documentLanguageSchema,
  documentAudienceSchema,
  documentRegionSchema,
  documentMetadataSchema,
} from "./document";
export {
  searchParamsSchema,
  searchResultSchema,
} from "./search";

// Export inferred types with different names to avoid conflicts with types folder
export type {
  ChatQuery as ChatQuerySchemaType,
  ChatResponse as ChatResponseSchemaType,
} from "./chat";
export type {
  UserProfile as UserProfileSchemaType,
} from "./user";
export type {
  DocumentMetadata as DocumentMetadataSchemaType,
} from "./document";
export type {
  SearchParams as SearchParamsSchemaType,
  SearchResult as SearchResultSchemaType,
} from "./search";

