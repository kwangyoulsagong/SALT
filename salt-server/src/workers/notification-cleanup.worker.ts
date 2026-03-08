import cron from "node-cron";
import prisma from "../config/database";

export class NotificationCleanupWorker {
  private running = false;

  start() {
    console.log("🧹 Notification Cleanup Worker started");

    // 서버 시작 시 1회 실행
    this.run();

    // 1시간마다 실행
    cron.schedule("0 * * * *", () => {
      this.run();
    });
  }

  private async run() {
    if (this.running) {
      console.log("⚠️ Cleanup worker already running");
      return;
    }

    this.running = true;

    try {
      console.log("🧹 Cleaning expired notifications...");

      const result = await prisma.investmentNotification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      console.log(`🧹 Deleted ${result.count} expired notifications`);
    } catch (error) {
      console.error("Notification cleanup error:", error);
    } finally {
      this.running = false;
    }
  }
}
