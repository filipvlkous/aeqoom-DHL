import { storeService } from '../serverStore';
const fs = require('fs');
const path = require('path');

class CleanupUtil {
  private LAST_CLEANUP_FILE = '';
  private CLEANUP_FOLDER = '';

  constructor() {}

  async initData() {
    const ftpConfig = await storeService.get('ftpConfig');
    if (ftpConfig.rootPath) {
      this.CLEANUP_FOLDER = ftpConfig.rootPath;
    }
    const lastCleanup = await storeService.get('lastCleanup');
    if (lastCleanup) {
      this.LAST_CLEANUP_FILE = lastCleanup;
    }
  }

  async clearFolder(folderPath: string) {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      return;
    }

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        fs.rmSync(filePath, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to delete ${filePath}:`, err);
      }
    }

    // Save last cleanup time
    await storeService.set('lastCleanup', new Date().toISOString());
    console.log(
      `Cleared folder: ${folderPath} at ${new Date().toLocaleString()}`,
    );
  }

  shouldCleanup() {
    if (!fs.existsSync(this.LAST_CLEANUP_FILE)) return true;

    try {
      const lastCleanup = new Date(
        fs.readFileSync(this.LAST_CLEANUP_FILE, 'utf8'),
      );
      const now = new Date();

      // Check if it's a new day
      return lastCleanup.toDateString() !== now.toDateString();
    } catch {
      return true;
    }
  }

  async scheduleDailyCleanup() {
    try {
      await this.initData();
      // 1. Check on startup - if app was off and it's a new day, clean now
      console.log(this.CLEANUP_FOLDER, this.LAST_CLEANUP_FILE);
      if (this.shouldCleanup()) {
        console.log('New day detected - cleaning up...');
        this.clearFolder(this.CLEANUP_FOLDER);
      }

      // 2. Schedule cleanup at next midnight
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const msUntilMidnight = tomorrow.getTime() - now.getTime();

      setTimeout(() => {
        this.clearFolder(this.CLEANUP_FOLDER);
        // Then repeat every 24 hours
        setInterval(
          () => this.clearFolder(this.CLEANUP_FOLDER),
          24 * 60 * 60 * 1000,
        );
      }, msUntilMidnight);

      console.log(
        `Next cleanup scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`,
      );
    } catch {
      console.log('sdasdads');
    }
  }
}

export const cleanupUtil = new CleanupUtil();
