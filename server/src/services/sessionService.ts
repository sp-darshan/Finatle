import { prisma } from '../config/db';
import { cacheService } from './cacheService';
import { inMemoryUsers } from './authService';

export class SessionService {
  /**
   * Get the active token version for a user.
   * Checks L1 in-memory and L2 Redis dual-tier cache first for sub-millisecond response.
   */
  static async getUserTokenVersion(userId: string): Promise<number> {
    const cacheKey = `auth:token_version:${userId}`;

    // 1. Dual-tier cache lookup (L1 In-Memory + L2 Upstash Redis)
    const cached = await cacheService.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // 2. Database lookup
    try {
      const user = await prisma.user.findUnique({
        where: { uid: userId },
        select: { tokenVersion: true },
      });
      const version = user?.tokenVersion ?? 0;
      await cacheService.set(cacheKey, version, 7 * 24 * 3600);
      return version;
    } catch {
      const fallback = inMemoryUsers.find((u) => u.uid === userId);
      const version = (fallback as any)?.tokenVersion ?? 0;
      await cacheService.set(cacheKey, version, 7 * 24 * 3600);
      return version;
    }
  }

  /**
   * Invalidate and revoke all existing sessions across all other devices.
   * Increments user's tokenVersion in both PostgreSQL and Redis dual-tier cache.
   * Returns the new tokenVersion to be assigned to the new token of the active device.
   */
  static async revokeAllOtherSessions(userId: string): Promise<number> {
    let newVersion = 1;
    const cacheKey = `auth:token_version:${userId}`;

    try {
      const updated = await prisma.user.update({
        where: { uid: userId },
        data: { tokenVersion: { increment: 1 } },
        select: { tokenVersion: true },
      });
      newVersion = updated.tokenVersion;
    } catch {
      const fallback = inMemoryUsers.find((u) => u.uid === userId);
      if (fallback) {
        (fallback as any).tokenVersion = ((fallback as any).tokenVersion || 0) + 1;
        newVersion = (fallback as any).tokenVersion;
      }
    }

    // Immediately synchronize to Redis and L1 in-memory cache
    await cacheService.set(cacheKey, newVersion, 7 * 24 * 3600);
    return newVersion;
  }
}

