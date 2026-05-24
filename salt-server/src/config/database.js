"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
const prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
});
async function connectDatabase() {
    try {
        await prisma.$connect();
        logger_1.logger.info("✅ Database connected successfully");
    }
    catch (error) {
        logger_1.logger.error("❌ Database connection failed:", error);
        throw error;
    }
}
async function disconnectDatabase() {
    try {
        await prisma.$disconnect();
        logger_1.logger.info("Database disconnected");
    }
    catch (error) {
        logger_1.logger.error("Error disconnecting database:", error);
    }
}
exports.default = prisma;
//# sourceMappingURL=database.js.map