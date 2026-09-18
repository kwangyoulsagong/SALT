import { z } from 'zod';

export const createTransactionSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  transactionType: z.enum(['buy', 'sell']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  fee: z.number().min(0).optional().default(0),
  note: z.string().max(500).optional(),
  transactionDate: z.string().datetime().optional(),
});

export const updateTransactionSchema = z.object({
  quantity: z.number().positive().optional(),
  price: z.number().positive().optional(),
  fee: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
  transactionDate: z.string().datetime().optional(),
});

export const queryTransactionsSchema = z.object({
  symbol: z.string().optional(),
  transactionType: z.enum(['buy', 'sell']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export const queryHoldingsSchema = z.object({
  symbol: z.string().optional(),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
export type QueryTransactionsDto = z.infer<typeof queryTransactionsSchema>;
export type QueryHoldingsDto = z.infer<typeof queryHoldingsSchema>;
