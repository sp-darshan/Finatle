import { prisma } from '../config/db';
import { inMemoryUsers } from './authService';
import { UpdateProfileDto } from '../types/auth.types';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../errors/AppError';
import { parseOptionalAge, sanitizeString } from '../utils/parsers';
import { cacheService } from './cacheService';

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
          accounts: true,
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
          accounts: fallbackUser.accounts || [],
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
    
    let sanitizedName: string | undefined = undefined;
    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new BadRequestError('Name cannot be empty.');
      }
      sanitizedName = name.trim();
    }

    let cleanedPhone: string | undefined = undefined;
    if (phone !== undefined) {
      cleanedPhone = phone ? phone.replace(/\D/g, '') : '';
      if (cleanedPhone.length !== 10) {
        throw new BadRequestError('Please enter a valid 10-digit mobile number.');
      }
    }

    try {
      const updated = await prisma.user.update({
        where: { uid: userId },
        data: {
          name: sanitizedName,
          phone: cleanedPhone,
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

      await cacheService.invalidateUserFinance(userId);

      return {
        message: 'Profile updated successfully.',
        user: updated,
      };
    } catch (dbError: any) {
      if (dbError instanceof BadRequestError || dbError instanceof UnauthorizedError) {
        throw dbError;
      }

      console.error('[UserService] Profile update error:', dbError?.message || dbError);
      const fallbackUser = inMemoryUsers.find((u) => u.uid === userId);
      if (!fallbackUser) {
        throw new NotFoundError(dbError?.message || 'User Not Found');
      }

      if (sanitizedName !== undefined) fallbackUser.name = sanitizedName;
      if (cleanedPhone !== undefined) fallbackUser.phone = cleanedPhone;
      if (parsedAge !== undefined && parsedAge !== -1) fallbackUser.age = parsedAge;

      await cacheService.invalidateUserFinance(userId);

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
      const deletedUser = await prisma.$transaction(
        async (tx) => {
          await tx.account.deleteMany({ where: { uid: userId } });
          await tx.transaction.deleteMany({ where: { uid: userId } });
          await tx.moneyLent.deleteMany({ where: { uid: userId } });
          await tx.moneyBorrowed.deleteMany({ where: { uid: userId } });
          return tx.user.delete({
            where: { uid: userId },
            select: { uid: true, email: true },
          });
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      );

      await cacheService.invalidateUserFinance(userId);

      return {
        message: 'User account and all financial records have been completely deleted.',
        user: deletedUser,
      };
    } catch (dbError: any) {
      const userIndex = inMemoryUsers.findIndex((u) => u.uid === userId);
      if (userIndex === -1) {
        throw new NotFoundError('User Not Found');
      }

      const [deleted] = inMemoryUsers.splice(userIndex, 1);
      await cacheService.invalidateUserFinance(userId);
      return {
        message: 'User account deleted successfully.',
        user: { uid: deleted.uid, email: deleted.email },
      };
    }
  }
}
