import { z } from 'zod';

export const addToWatchlistSchema = z.object({
  assetType: z.enum(['crypto', 'stock']),
  symbol: z.string().min(1, 'Symbol is required'),
  name: z.string().min(1, 'Name is required'),
});

export const requestAnalysisSchema = z.object({
  assetType: z.enum(['crypto', 'stock']),
  symbol: z.string().min(1, 'Symbol is required'),
});

export const queryWatchlistSchema = z.object({
  assetType: z.enum(['crypto', 'stock']).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export type AddToWatchlistDto = z.infer<typeof addToWatchlistSchema>;
export type RequestAnalysisDto = z.infer<typeof requestAnalysisSchema>;
export type QueryWatchlistDto = z.infer<typeof queryWatchlistSchema>;
