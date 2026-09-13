import { prisma } from '../config/db';
import { inMemoryUsers } from './authService';
import { UpdateProfileDto } from '../types/auth.types';
import { NotFoundError, UnauthorizedError } from '../errors/AppError';
import { parseOptionalAge, sanitizeString } from '../utils/parsers';

export class UserService {
  /**
   * Fetch current user profile and associated records
   */
  static async getUserProfile(userId?: string) {
    if (!userId) {
      throw new UnauthorizedError('No authenticated user found');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { uid: userId },
        select: {
          uid: true,
          email: true,
          name: true,
          phone: true,
          age: true,
          createdAt: true,
          account: true,
          transactions: true,
          moneyLent: true,
          moneyBorrowed: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User Not Found');
      }

      return { user };
    } catch (dbError) {
      if (dbError instanceof NotFoundError || dbError instanceof UnauthorizedError) {
        throw dbError;
      }

      const fallbackUser = inMemoryUsers.find((u) => u.uid === userId);
      if (!fallbackUser) {
        throw new NotFoundError('User Not Found');
      }

      return {
        user: {
          uid: fallbackUser.uid,
          email: fallbackUser.email,
          name: fallbackUser.name,
          phone: fallbackUser.phone,
          age: fallbackUser.age,
          createdAt: fallbackUser.createdAt,
          account: fallbackUser.account,
          transactions: [],
          moneyLent: [],
          moneyBorrowed: [],
        },
      };
    }
  }

  /**
   * Update user details (Name, Phone number, Age)
   */
  static async updateUserProfile(userId: string | undefined, dto: UpdateProfileDto) {
    if (!userId) {
      throw new UnauthorizedError('No authenticated user found');
    }

    const { name, phone, age } = dto;
    const parsedAge = age !== undefined ? parseOptionalAge(age) : undefined;
    const sanitizedName = name !== undefined ? sanitizeString(name) : undefined;
    const sanitizedPhone = phone !== undefined ? sanitizeString(phone) : undefined;

    try {
      const updated = await prisma.user.update({
        where: { uid: userId },
        data: {
          name: sanitizedName,
          phone: sanitizedPhone,
          age: parsedAge !== -1 ? parsedAge : undefined,
        },
        select: {
          uid: true,
          email: true,
          name: true,
          phone: true,
          age: true,
          createdAt: true,
        },
      });

      return {
        message: 'Profile updated successfully.',
        user: updated,
      };
    } catch (dbError: any) {
      console.error('[UserService] Profile update error:', dbError?.message || dbError);
      const fallbackUser = inMemoryUsers.find((u) => u.uid === userId);
      if (!fallbackUser) {
        throw new NotFoundError(dbError?.message || 'User Not Found');
      }

      if (sanitizedName !== undefined) fallbackUser.name = sanitizedName;
      if (sanitizedPhone !== undefined) fallbackUser.phone = sanitizedPhone;
      if (parsedAge !== undefined && parsedAge !== -1) fallbackUser.age = parsedAge;

      return {
        message: 'Profile updated successfully.',
        user: {
          uid: fallbackUser.uid,
          email: fallbackUser.email,
          name: fallbackUser.name,
          phone: fallbackUser.phone ?? null,
          age: fallbackUser.age ?? null,
          createdAt: fallbackUser.createdAt,
        },
      };
    }
  }

  /**
   * Delete user and all associated financial records
   */
  static async deleteUserAccount(userId?: string) {
    if (!userId) {
      throw new UnauthorizedError('No authenticated user found');
    }

    try {
      const deletedUser = await prisma.$transaction(async (tx) => {
        await tx.account.deleteMany({ where: { uid: userId } });
        await tx.transaction.deleteMany({ where: { uid: userId } });
        await tx.moneyLent.deleteMany({ where: { uid: userId } });
        await tx.moneyBorrowed.deleteMany({ where: { uid: userId } });
        return tx.user.delete({
          where: { uid: userId },
          select: { uid: true },
        });
      });

      return {
        success: true,
        message: 'User and all related financial records were deleted.',
        uid: deletedUser.uid,
      };
    } catch (dbError) {
      const userIndex = inMemoryUsers.findIndex((user) => user.uid === userId);
      if (userIndex === -1) {
        throw new NotFoundError('User Not Found');
      }

      inMemoryUsers.splice(userIndex, 1);
      return {
        success: true,
        message: 'User and all related in-memory financial records were deleted.',
        uid: userId,
      };
    }
  }
}
