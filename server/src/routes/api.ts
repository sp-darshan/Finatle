import { Router, Request, Response } from 'express';
import { checkDatabaseConnection, prisma, pgPool } from '../db';

const router = Router();

// In-memory fallback cache if PostgreSQL is not yet created/migrated
let inMemoryItems = [
  {
    id: '1',
    title: 'Initial Setup Complete',
    description: 'React, Express.js, and PostgreSQL architecture setup.',
    amount: 1500.0,
    category: 'Development',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Cloud Database Config',
    description: 'PostgreSQL connection configured with pg pool and Prisma.',
    amount: 350.5,
    category: 'Infrastructure',
    createdAt: new Date().toISOString(),
  },
];

// Health Check Endpoint
router.get('/health', async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();
  res.json({
    status: 'online',
    serverTimestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
});

// GET /api/items - Retrieve all items
router.get('/items', async (req: Request, res: Response) => {
  try {
    // Try fetching from Prisma DB
    const items = await prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ source: 'database', items });
  } catch (dbError) {
    // If DB is not yet initialized or connected, return in-memory items gracefully
    return res.json({
      source: 'in-memory-fallback',
      message: 'Database query failed or table not migrated yet. Showing fallback data.',
      items: inMemoryItems,
    });
  }
});

// POST /api/items - Create a new item
router.post('/items', async (req: Request, res: Response) => {
  const { title, description, amount, category } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const numericAmount = parseFloat(amount) || 0.0;
  const itemCategory = category || 'General';

  try {
    const newItem = await prisma.item.create({
      data: {
        title,
        description: description || '',
        amount: numericAmount,
        category: itemCategory,
      },
    });
    return res.status(201).json({ source: 'database', item: newItem });
  } catch (dbError) {
    // Fallback insertion
    const newItem = {
      id: Date.now().toString(),
      title,
      description: description || '',
      amount: numericAmount,
      category: itemCategory,
      createdAt: new Date().toISOString(),
    };
    inMemoryItems.unshift(newItem);
    return res.status(201).json({
      source: 'in-memory-fallback',
      message: 'Saved to transient memory because PostgreSQL table is not migrated yet.',
      item: newItem,
    });
  }
});

// DELETE /api/items/:id - Delete item
router.delete('/items/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.item.delete({ where: { id } });
    return res.json({ success: true, message: 'Item deleted from database' });
  } catch (dbError) {
    inMemoryItems = inMemoryItems.filter((item) => item.id !== id);
    return res.json({ success: true, message: 'Item deleted from transient memory' });
  }
});

export default router;
