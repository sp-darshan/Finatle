import { Request, Response } from 'express';
import { prisma } from '../db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

// In-memory fallback users for dev / unmigrated database state
const inMemoryUsers: any[] = [];

/**
 * Register / Sign Up a new user with age, name, email, and salted password hash
 */
export async function signUp(req: Request, res: Response) {
  try {
    const { email, password, name, age } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required fields.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long.',
      });
    }

    const parsedAge = age !== undefined && age !== null && age !== '' ? parseInt(age, 10) : null;
    if (parsedAge !== null && (isNaN(parsedAge) || parsedAge < 0)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Age must be a valid positive integer.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Hash the password with salt (10 rounds)
    const hashedPassword = await hashPassword(password);

    try {
      // Check if user exists in database
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A user with this email address already exists.',
        });
      }

      // Create new user in PostgreSQL / Supabase
      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: name ? name.trim() : null,
          age: parsedAge,
          account: {
            create: {
              balance: 0,
            },
          },
        },
        include: { account: true },
      });

      const token = generateToken({ userId: newUser.uid, email: newUser.email });

      return res.status(201).json({
        message: 'User registered successfully in PostgreSQL database.',
        token,
        user: {
          uid: newUser.uid,
          email: newUser.email,
          name: newUser.name,
          age: newUser.age,
          account: newUser.account,
          createdAt: newUser.createdAt,
        },
      });
    } catch (dbError) {
      // Fallback in-memory user registration if DB is not yet migrated/connected
      const existingFallback = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (existingFallback) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A user with this email address already exists (in-memory).',
        });
      }

      const fallbackUser = {
        uid: `mock-${Date.now()}`,
        email: normalizedEmail,
        password: hashedPassword,
        name: name ? name.trim() : null,
        age: parsedAge,
        createdAt: new Date().toISOString(),
          account: { balance: 0 },
      };
      inMemoryUsers.push(fallbackUser);

      const token = generateToken({ userId: fallbackUser.uid, email: fallbackUser.email });

      return res.status(201).json({
        message: 'User registered successfully (in-memory fallback mode). Connect Supabase/PostgreSQL to persist permanently.',
        token,
        user: {
          uid: fallbackUser.uid,
          email: fallbackUser.email,
          name: fallbackUser.name,
          age: fallbackUser.age,
          account: fallbackUser.account,
          createdAt: fallbackUser.createdAt,
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to complete registration.',
    });
  }
}

/**
 * Sign In / Login user with email and password
 */
export async function signIn(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Attempt DB lookup
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password.',
        });
      }

      // Verify bcrypt hash with stored salt
      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password.',
        });
      }

      const token = generateToken({ userId: user.uid, email: user.email });

      return res.json({
        message: 'Signed in successfully.',
        token,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          age: user.age,
          createdAt: user.createdAt,
        },
      });
    } catch (dbError) {
      // Fallback in-memory sign-in
      const user = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password (in-memory).',
        });
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password.',
        });
      }

      const token = generateToken({ userId: user.uid, email: user.email });

      return res.json({
        message: 'Signed in successfully (in-memory mode).',
        token,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          age: user.age,
          createdAt: user.createdAt,
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to sign in.',
    });
  }
}

/**
 * Get current authenticated user profile
 */
export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'No authenticated user found' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { uid: userId },
        select: {
          uid: true,
          email: true,
          name: true,
          age: true,
          createdAt: true,
          account: true,
          transactions: true,
          moneyLent: true,
          moneyBorrowed: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User Not Found' });
      }

      return res.json({ user });
    } catch (dbError) {
      const fallbackUser = inMemoryUsers.find((u) => u.uid === userId);
      if (!fallbackUser) {
        return res.status(404).json({ error: 'User Not Found' });
      }

      return res.json({
        user: {
          uid: fallbackUser.uid,
          email: fallbackUser.email,
          name: fallbackUser.name,
          age: fallbackUser.age,
          createdAt: fallbackUser.createdAt,
          account: fallbackUser.account,
          transactions: [],
          moneyLent: [],
          moneyBorrowed: [],
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

export async function deleteMe(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No authenticated user found' });
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

    return res.json({
      success: true,
      message: 'User and all related financial records were deleted.',
      uid: deletedUser.uid,
    });
  } catch (dbError) {
    const userIndex = inMemoryUsers.findIndex((user) => user.uid === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User Not Found' });
    }

    inMemoryUsers.splice(userIndex, 1);
    return res.json({
      success: true,
      message: 'User and all related in-memory financial records were deleted.',
      uid: userId,
    });
  }
}
