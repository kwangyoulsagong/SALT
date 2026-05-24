import { PrismaClient } from "@prisma/client";
declare const prisma: PrismaClient<{
    log: ("error" | "query" | "warn")[];
}, "error" | "query" | "warn", import("@prisma/client/runtime/library").DefaultArgs>;
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export default prisma;
