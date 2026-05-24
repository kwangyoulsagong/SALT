import { z } from 'zod';
export declare const addToWatchlistSchema: z.ZodObject<{
    assetType: z.ZodEnum<{
        crypto: "crypto";
        stock: "stock";
    }>;
    symbol: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const requestAnalysisSchema: z.ZodObject<{
    assetType: z.ZodEnum<{
        crypto: "crypto";
        stock: "stock";
    }>;
    symbol: z.ZodString;
}, z.core.$strip>;
export declare const queryWatchlistSchema: z.ZodObject<{
    assetType: z.ZodOptional<z.ZodEnum<{
        crypto: "crypto";
        stock: "stock";
    }>>;
    page: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    limit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
}, z.core.$strip>;
export type AddToWatchlistDto = z.infer<typeof addToWatchlistSchema>;
export type RequestAnalysisDto = z.infer<typeof requestAnalysisSchema>;
export type QueryWatchlistDto = z.infer<typeof queryWatchlistSchema>;
