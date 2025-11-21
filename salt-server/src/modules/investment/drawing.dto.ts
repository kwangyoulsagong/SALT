import { z } from 'zod';

export const drawingToolSchema = z.object({
  type: z.enum(['trendline', 'horizontal', 'vertical', 'fibonacci', 'rectangle', 'text']),
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
  })),
  color: z.string().optional().default('#000000'),
  width: z.number().optional().default(2),
  text: z.string().optional(), // 텍스트 도구용
  fontSize: z.number().optional(), // 텍스트 도구용
});

export const createDrawingSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  chartPeriod: z.enum(['minute', 'hour', 'day', 'week', 'month']),
  drawingData: z.array(drawingToolSchema),
  thumbnail: z.string().url().optional(),
  isPublic: z.boolean().optional().default(false),
});

export const updateDrawingSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  drawingData: z.array(drawingToolSchema).optional(),
  thumbnail: z.string().url().optional(),
  isPublic: z.boolean().optional(),
});

export const queryDrawingsSchema = z.object({
  symbol: z.string().optional(),
  isPublic: z.string().transform((val) => val === 'true').optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export type CreateDrawingDto = z.infer<typeof createDrawingSchema>;
export type UpdateDrawingDto = z.infer<typeof updateDrawingSchema>;
export type QueryDrawingsDto = z.infer<typeof queryDrawingsSchema>;
