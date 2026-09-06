import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

function getUserId(req: AuthenticatedRequest) {
  return req.user?.userId;
}

function parseAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export async function getFinanceSummary(req: AuthenticatedRequest, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const [account, transactions, moneyLent, moneyBorrowed] = await Promise.all([
    prisma.account.findUnique({ where: { uid: userId } }),
    prisma.transaction.findMany({ where: { uid: userId }, orderBy: { occurredAt: 'desc' }, take: 50 }),
    prisma.moneyLent.findMany({ where: { uid: userId }, orderBy: { lentAt: 'desc' } }),
    prisma.moneyBorrowed.findMany({ where: { uid: userId }, orderBy: { borrowedAt: 'desc' } }),
  ]);

  return res.json({
    account: account || { balance: 0 },
    transactions,
    moneyLent,
    moneyBorrowed,
  });
}

export async function getAccountBalance(req: AuthenticatedRequest, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const account = await prisma.account.findUnique({ where: { uid: userId } });
  return res.json({
    account: account || { uid: userId, balance: 0 },
  });
}

export async function createTransaction(req: AuthenticatedRequest, res: Response) {
  const userId = getUserId(req);
  const { type, description, category, occurredAt } = req.body;
  const amount = parseAmount(req.body.amount);

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!amount || !['INCOME', 'EXPENSE'].includes(type)) {
    return res.status(400).json({ error: 'Type must be INCOME or EXPENSE and amount must be greater than zero.' });
  }

  if (type === 'EXPENSE') {
    const [transactions, moneyLent, moneyBorrowed] = await Promise.all([
      prisma.transaction.findMany({ where: { uid: userId }, select: { type: true, amount: true } }),
      prisma.moneyLent.findMany({ where: { uid: userId }, select: { amount: true, paidAmount: true, status: true } }),
      prisma.moneyBorrowed.findMany({ where: { uid: userId }, select: { amount: true, paidAmount: true, status: true } }),
    ]);
    const transactionBalance = transactions.reduce(
      (total, transaction) => total + (transaction.type === 'INCOME' ? Number(transaction.amount) : -Number(transaction.amount)),
      0,
    );
    const outstandingLent = moneyLent.reduce(
      (total, loan) => total + Math.max(0, Number(loan.amount) - Number(loan.paidAmount || (loan.status === 'PAID' ? loan.amount : 0))),
      0,
    );
    const outstandingBorrowed = moneyBorrowed.reduce(
      (total, loan) => total + Math.max(0, Number(loan.amount) - Number(loan.paidAmount || (loan.status === 'PAID' ? loan.amount : 0))),
      0,
    );
    const actualBalance = transactionBalance - outstandingLent + outstandingBorrowed;
    if (actualBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance for this expense.' });
    }
  }

  const balanceChange = type === 'INCOME' ? amount : -amount;
  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        uid: userId,
        type,
        amount: new Prisma.Decimal(amount),
        description: description?.trim() || null,
        category: category?.trim() || null,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      },
    });
    const updatedAccount = await tx.account.upsert({
      where: { uid: userId },
      create: { uid: userId, balance: new Prisma.Decimal(balanceChange) },
      update: { balance: { increment: new Prisma.Decimal(balanceChange) } },
    });
    return { transaction, account: updatedAccount };
  });

  return res.status(201).json(result);
}

export async function updateTransaction(req: AuthenticatedRequest, res: Response) {
  const userId = getUserId(req);
  const transactionId = req.params.transactionId;
  const { type, description, category, occurredAt } = req.body;
  const amount = req.body.amount !== undefined ? parseAmount(req.body.amount) : null;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const existing = await prisma.transaction.findFirst({
    where: { tid: transactionId, uid: userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const newType = type || existing.type;
  if (!['INCOME', 'EXPENSE'].includes(newType)) {
    return res.status(400).json({ error: 'Type must be INCOME or EXPENSE.' });
  }

  const newAmount = amount !== null ? amount : Number(existing.amount);
  if (!newAmount || newAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero.' });
  }

  // Calculate balance difference between old and new transaction
  const oldImpact = existing.type === 'INCOME' ? Number(existing.amount) : -Number(existing.amount);
  const newImpact = newType === 'INCOME' ? newAmount : -newAmount;
  const netDifference = newImpact - oldImpact;
  const currentAccount = await prisma.account.findUnique({ where: { uid: userId } });
  if (Number(currentAccount?.balance || 0) + netDifference < 0) {
    return res.status(400).json({ error: 'Insufficient balance for this transaction.' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.update({
      where: { tid: existing.tid },
      data: {
        type: newType as any,
        amount: new Prisma.Decimal(newAmount),
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        category: category !== undefined ? (category?.trim() || null) : existing.category,
        occurredAt: occurredAt ? new Date(occurredAt) : existing.occurredAt,
      },
    });

    const account = await tx.account.upsert({
      where: { uid: userId },
      create: { uid: userId, balance: new Prisma.Decimal(netDifference) },
      update: { balance: { increment: new Prisma.Decimal(netDifference) } },
    });

    return { transaction, account };
  });

  return res.json(result);
}

export async function deleteTransaction(req: AuthenticatedRequest, res: Response) {
  const userId = getUserId(req);
  const transactionId = req.params.transactionId;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const existing = await prisma.transaction.findFirst({
    where: { tid: transactionId, uid: userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const reverseImpact = existing.type === 'INCOME' ? -Number(existing.amount) : Number(existing.amount);

  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { tid: existing.tid } });
    await tx.account.update({
      where: { uid: userId },
      data: { balance: { increment: new Prisma.Decimal(reverseImpact) } },
    });
  });

  return res.json({ message: 'Transaction deleted successfully' });
}

async function createLoan(req: AuthenticatedRequest, res: Response, kind: 'lent' | 'borrowed') {
  const userId = getUserId(req);
  const { personName, description, dueAt, paidAmount } = req.body;
  const amount = parseAmount(req.body.amount);

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!personName?.trim() || !amount) {
    return res.status(400).json({ error: 'Person name and an amount greater than zero are required.' });
  }

  const numericPaid = paidAmount !== undefined && !isNaN(Number(paidAmount))
    ? Math.max(0, Math.min(amount, Number(paidAmount)))
    : 0;
  const status = numericPaid >= amount ? 'PAID' : numericPaid > 0 ? 'PARTIAL' : 'PENDING';

  const data = {
    uid: userId,
    personName: personName.trim(),
    amount: new Prisma.Decimal(amount),
    paidAmount: new Prisma.Decimal(numericPaid),
    description: description?.trim() || null,
    dueAt: dueAt ? new Date(dueAt) : null,
    status: status as any,
  };
  if (kind === 'lent') {
    const [transactions, moneyLent, moneyBorrowed] = await Promise.all([
      prisma.transaction.findMany({ where: { uid: userId }, select: { type: true, amount: true } }),
      prisma.moneyLent.findMany({ where: { uid: userId }, select: { amount: true, paidAmount: true, status: true } }),
      prisma.moneyBorrowed.findMany({ where: { uid: userId }, select: { amount: true, paidAmount: true, status: true } }),
    ]);
    const transactionBalance = transactions.reduce(
      (total, transaction) => total + (transaction.type === 'INCOME' ? Number(transaction.amount) : -Number(transaction.amount)),
      0,
    );
    const outstandingLent = moneyLent.reduce(
      (total, loan) => total + Math.max(0, Number(loan.amount) - Number(loan.paidAmount || (loan.status === 'PAID' ? loan.amount : 0))),
      0,
    );
    const outstandingBorrowed = moneyBorrowed.reduce(
      (total, loan) => total + Math.max(0, Number(loan.amount) - Number(loan.paidAmount || (loan.status === 'PAID' ? loan.amount : 0))),
      0,
    );
    const actualBalance = transactionBalance - outstandingLent + outstandingBorrowed;
    if (actualBalance < amount - numericPaid) {
      return res.status(400).json({ error: 'Insufficient balance to lend this amount.' });
    }
  }
  const balanceChange = kind === 'lent' ? numericPaid - amount : amount - numericPaid;
  const result = await prisma.$transaction(async (tx) => {
    const loan = kind === 'lent'
      ? await tx.moneyLent.create({ data })
      : await tx.moneyBorrowed.create({ data });
    const account = await tx.account.upsert({
      where: { uid: userId },
      create: { uid: userId, balance: new Prisma.Decimal(balanceChange) },
      update: { balance: { increment: new Prisma.Decimal(balanceChange) } },
    });
    return { loan, account };
  });

  return res.status(201).json(result);
}

export const createMoneyLent = (req: AuthenticatedRequest, res: Response) => createLoan(req, res, 'lent');
export const createMoneyBorrowed = (req: AuthenticatedRequest, res: Response) => createLoan(req, res, 'borrowed');

export async function updateLoanStatus(req: AuthenticatedRequest, res: Response) {
  const userId = getUserId(req);
  const { status, paidAmount } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const loanId = req.params.loanId;
  const lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
  if (lent) {
    const totalAmount = Number(lent.amount);
    const oldPaid = Number((lent as any).paidAmount || (lent.status === 'PAID' ? totalAmount : 0));
    
    let newPaid = oldPaid;
    let newStatus = lent.status;

    if (paidAmount !== undefined && !isNaN(Number(paidAmount))) {
      newPaid = Math.max(0, Math.min(totalAmount, Number(paidAmount)));
      newStatus = (newPaid >= totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING') as any;
    } else if (status) {
      if (status === 'PAID') {
        newPaid = totalAmount;
        newStatus = 'PAID';
      } else if (status === 'PENDING') {
        newPaid = 0;
        newStatus = 'PENDING';
      } else {
        newStatus = status;
      }
    }

    const repaymentChange = newPaid - oldPaid;
    const account = await prisma.account.findUnique({ where: { uid: userId } });
    if (Number(account?.balance || 0) + repaymentChange < 0) {
      return res.status(400).json({ error: 'Insufficient balance to reopen this lent record.' });
    }
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.moneyLent.update({
        where: { lid: lent.lid },
        data: { status: newStatus as any, paidAmount: new Prisma.Decimal(newPaid) },
      });
      const account = await tx.account.update({
        where: { uid: userId },
        data: { balance: { increment: new Prisma.Decimal(repaymentChange) } },
      });
      return { loan, account };
    });
    return res.json(result);
  }

  const borrowed = await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } });
  if (borrowed) {
    const totalAmount = Number(borrowed.amount);
    const oldPaid = Number((borrowed as any).paidAmount || (borrowed.status === 'PAID' ? totalAmount : 0));
    
    let newPaid = oldPaid;
    let newStatus = borrowed.status;

    if (paidAmount !== undefined && !isNaN(Number(paidAmount))) {
      newPaid = Math.max(0, Math.min(totalAmount, Number(paidAmount)));
      newStatus = (newPaid >= totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING') as any;
    } else if (status) {
      if (status === 'PAID') {
        newPaid = totalAmount;
        newStatus = 'PAID';
      } else if (status === 'PENDING') {
        newPaid = 0;
        newStatus = 'PENDING';
      } else {
        newStatus = status;
      }
    }

    const repaymentChange = -(newPaid - oldPaid);
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.moneyBorrowed.update({
        where: { bid: borrowed.bid },
        data: { status: newStatus as any, paidAmount: new Prisma.Decimal(newPaid) },
      });
      const account = await tx.account.update({
        where: { uid: userId },
        data: { balance: { increment: new Prisma.Decimal(repaymentChange) } },
      });
      return { loan, account };
    });
    return res.json(result);
  }

  return res.status(404).json({ error: 'Loan not found' });
}

export async function updateLoan(req: AuthenticatedRequest, res: Response) {
  const userId = getUserId(req);
  const loanId = req.params.loanId;
  const { personName, amount, description, dueAt, status, kind, paidAmount } = req.body;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
  const borrowed = !lent ? await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } }) : null;

  if (!lent && !borrowed) {
    return res.status(404).json({ error: 'Loan record not found' });
  }

  const existing = lent || borrowed!;
  const existingKind = lent ? 'lent' : 'borrowed';
  const targetKind = kind && (kind === 'lent' || kind === 'borrowed') ? kind : existingKind;

  const newAmount = amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0 ? Number(amount) : Number(existing.amount);
  const oldPaid = Number((existing as any).paidAmount || (existing.status === 'PAID' ? Number(existing.amount) : 0));
  
  let newPaid = paidAmount !== undefined && !isNaN(Number(paidAmount))
    ? Math.max(0, Math.min(newAmount, Number(paidAmount)))
    : status === 'PAID'
    ? newAmount
    : status === 'PENDING'
    ? 0
    : Math.min(newAmount, oldPaid);

  let newStatus = status;
  if (newPaid >= newAmount) newStatus = 'PAID';
  else if (newPaid > 0) newStatus = 'PARTIAL';
  else if (!newStatus || newStatus === 'PAID') newStatus = 'PENDING';

  const newPersonName = personName ? personName.trim() : existing.personName;
  const newDescription = description !== undefined ? (description ? description.trim() : null) : existing.description;
  const newDueAt = dueAt !== undefined ? (dueAt ? new Date(dueAt) : null) : existing.dueAt;

  const oldEffect = existingKind === 'lent' ? oldPaid - Number(existing.amount) : Number(existing.amount) - oldPaid;
  const newEffect = targetKind === 'lent' ? newPaid - newAmount : newAmount - newPaid;
  const balanceDelta = newEffect - oldEffect;
  if (balanceDelta < 0) {
    const account = await prisma.account.findUnique({ where: { uid: userId } });
    if (Number(account?.balance || 0) + balanceDelta < 0) {
      return res.status(400).json({ error: 'Insufficient balance to update this lent record.' });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let updatedLoan;
    if (existingKind === targetKind) {
      if (existingKind === 'lent') {
        updatedLoan = await tx.moneyLent.update({
          where: { lid: loanId },
          data: {
            personName: newPersonName,
            amount: new Prisma.Decimal(newAmount),
            paidAmount: new Prisma.Decimal(newPaid),
            description: newDescription,
            dueAt: newDueAt,
            status: newStatus as any,
          },
        });
      } else {
        updatedLoan = await tx.moneyBorrowed.update({
          where: { bid: loanId },
          data: {
            personName: newPersonName,
            amount: new Prisma.Decimal(newAmount),
            paidAmount: new Prisma.Decimal(newPaid),
            description: newDescription,
            dueAt: newDueAt,
            status: newStatus as any,
          },
        });
      }
    } else {
      if (existingKind === 'lent') {
        await tx.moneyLent.delete({ where: { lid: loanId } });
        updatedLoan = await tx.moneyBorrowed.create({
          data: {
            bid: loanId,
            uid: userId,
            personName: newPersonName,
            amount: new Prisma.Decimal(newAmount),
            paidAmount: new Prisma.Decimal(newPaid),
            description: newDescription,
            dueAt: newDueAt,
            status: newStatus as any,
          },
        });
      } else {
        await tx.moneyBorrowed.delete({ where: { bid: loanId } });
        updatedLoan = await tx.moneyLent.create({
          data: {
            lid: loanId,
            uid: userId,
            personName: newPersonName,
            amount: new Prisma.Decimal(newAmount),
            paidAmount: new Prisma.Decimal(newPaid),
            description: newDescription,
            dueAt: newDueAt,
            status: newStatus as any,
          },
        });
      }
    }

    const account = await tx.account.upsert({
      where: { uid: userId },
      create: { uid: userId, balance: new Prisma.Decimal(balanceDelta) },
      update: { balance: { increment: new Prisma.Decimal(balanceDelta) } },
    });

    return { loan: updatedLoan, account };
  });

  return res.json(result);
}


export async function deleteLoan(req: AuthenticatedRequest, res: Response) {
  const userId = getUserId(req);
  const loanId = req.params.loanId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
  const borrowed = !lent ? await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } }) : null;

  if (!lent && !borrowed) {
    return res.status(404).json({ error: 'Loan record not found' });
  }

  const existing = lent || borrowed!;
  const existingKind = lent ? 'lent' : 'borrowed';
  const oldAmountNum = Number(existing.amount);
  const oldEffect = existingKind === 'lent'
    ? (existing.status === 'PAID' ? 0 : -oldAmountNum)
    : (existing.status === 'PAID' ? 0 : oldAmountNum);
  const balanceDelta = -oldEffect;

  await prisma.$transaction(async (tx) => {
    if (existingKind === 'lent') {
      await tx.moneyLent.delete({ where: { lid: loanId } });
    } else {
      await tx.moneyBorrowed.delete({ where: { bid: loanId } });
    }
    await tx.account.update({
      where: { uid: userId },
      data: { balance: { increment: new Prisma.Decimal(balanceDelta) } },
    });
  });

  return res.json({ message: 'Loan deleted successfully' });
}

