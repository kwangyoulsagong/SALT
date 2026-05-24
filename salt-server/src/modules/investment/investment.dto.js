"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryWatchlistSchema = exports.requestAnalysisSchema = exports.addToWatchlistSchema = void 0;
const zod_1 = require("zod");
exports.addToWatchlistSchema = zod_1.z.object({
    assetType: zod_1.z.enum(['crypto', 'stock']),
    symbol: zod_1.z.string().min(1, 'Symbol is required'),
    name: zod_1.z.string().min(1, 'Name is required'),
});
exports.requestAnalysisSchema = zod_1.z.object({
    assetType: zod_1.z.enum(['crypto', 'stock']),
    symbol: zod_1.z.string().min(1, 'Symbol is required'),
});
exports.queryWatchlistSchema = zod_1.z.object({
    assetType: zod_1.z.enum(['crypto', 'stock']).optional(),
    page: zod_1.z.string().transform(Number).optional(),
    limit: zod_1.z.string().transform(Number).optional(),
});
//# sourceMappingURL=investment.dto.js.map