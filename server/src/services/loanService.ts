import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { CalculationService } from './calculationService';
import { CreateLoanDto, UpdateLoanDto, UpdateLoanStatusDto } from '../types/finance.types';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/AppError';
import { parseAmount, sanitizeString } from '../utils/parsers';
import { cacheService } from './cacheService';

export class LoanService {
  /**
   * Create a new loan record (lent or borrowed)
   */
  static async createLoan(userId: string | undefined, dto: CreateLoanDto, kind: 'lent' | 'borrowed') {
    if (!userId) throw new UnauthorizedError();

    const { personName, description, dueAt, paidAmount } = dto;
    const amount = parseAmount(dto.amount);
    const sanitizedPerson = sanitizeString(personName);

    if (!sanitizedPerson || !amount) {
      throw new BadRequestError('Person name and an amount greater than zero are required.');
    }

    const numericPaid = paidAmount !== undefined && !isNaN(Number(paidAmount))
      ? Math.max(0, Math.min(amount, Number(paidAmount)))
      : 0;
    const status = numericPaid >= amount ? 'PAID' : numericPaid > 0 ? 'PARTIAL' : 'PENDING';

    let targetAccount = dto.accountId
      ? await prisma.account.findFirst({ where: { aid: dto.accountId, uid: userId } })
      : await prisma.account.findFirst({ where: { uid: userId, isDefault: true } });

    if (!targetAccount) {
      targetAccount = await prisma.account.findFirst({ where: { uid: userId } });
    }

    if (!targetAccount) {
      targetAccount = await prisma.account.create({
        data: {
          uid: userId,
          name: 'Cash',
          type: 'CASH',
          balance: 0,
          initialBalance: 0,
          color: '#10b981',
          isDefault: true,
        },
      });
    }

    const data = {
      uid: userId,
      accountId: targetAccount.aid,
      personName: sanitizedPerson,
      amount: new Prisma.Decimal(amount),
      paidAmount: new Prisma.Decimal(numericPaid),
      description: sanitizeString(description),
      dueAt: dueAt ? new Date(dueAt) : null,
      status: status as any,
    };

    const state = await CalculationService.getFinancialState(userId, targetAccount.aid);
    const loanImpact = kind === 'lent' ? numericPaid - amount : amount - numericPaid;
    const netSavingsImpact = kind === 'lent' ? loanImpact : 0;

    if (CalculationService.violatesBalanceRules(state.netSavings + netSavingsImpact, state.actualBalance + loanImpact)) {
      throw new BadRequestError('Insufficient balance in this account for this loan.');
    }

    const balanceChange = kind === 'lent' ? numericPaid - amount : amount - numericPaid;
    const result = await prisma.$transaction(async (tx) => {
      const loan = kind === 'lent'
        ? await tx.moneyLent.create({ data: data as any })
        : await tx.moneyBorrowed.create({ data: data as any });

      const account = await tx.account.update({
        where: { aid: targetAccount.aid },
        data: { balance: { increment: new Prisma.Decimal(balanceChange) } },
      });

      const loanId = kind === 'lent' ? (loan as any).lid : (loan as any).bid;
      return { loan: { ...loan, id: loanId, lid: (loan as any).lid, bid: (loan as any).bid, accountId: targetAccount.aid }, account };
    });

    await cacheService.invalidateUserFinance(userId);

    return result;
  }

  /**
   * Update the repayment status / paidAmount of a loan record
   */
  static async updateLoanStatus(userId: string | undefined, loanId: string, dto: UpdateLoanStatusDto) {
    if (!userId) throw new UnauthorizedError();

    const { status, paidAmount } = dto;

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
          newStatus = status as any;
        }
      }

      const repaymentChange = newPaid - oldPaid;
      const targetAccountId = lent.accountId || undefined;
      const state = await CalculationService.getFinancialState(userId, targetAccountId);
      if (CalculationService.violatesBalanceRules(state.netSavings + repaymentChange, state.actualBalance + repaymentChange)) {
        throw new BadRequestError('Insufficient balance in this account to reopen this lent record.');
      }

      const result = await prisma.$transaction(async (tx) => {
        const loan = await tx.moneyLent.update({
          where: { lid: lent.lid },
          data: { status: newStatus as any, paidAmount: new Prisma.Decimal(newPaid) },
        });

        let targetAccount = targetAccountId
          ? await tx.account.findFirst({ where: { aid: targetAccountId, uid: userId } })
          : await tx.account.findFirst({ where: { uid: userId, isDefault: true } }) || await tx.account.findFirst({ where: { uid: userId } });

        if (!targetAccount) {
          targetAccount = await tx.account.create({
            data: {
              uid: userId,
              name: 'Cash',
              type: 'CASH',
              balance: 0,
              initialBalance: 0,
              color: '#10b981',
              isDefault: true,
            },
          });
        }

        const account = await tx.account.update({
          where: { aid: targetAccount.aid },
          data: { balance: { increment: new Prisma.Decimal(repaymentChange) } },
        });
        return { loan: { ...loan, id: loan.lid, lid: loan.lid, accountId: targetAccount.aid }, account };
      });

      await cacheService.invalidateUserFinance(userId);

      return result;
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
          newStatus = status as any;
        }
      }

      const repaymentChange = -(newPaid - oldPaid);
      const targetAccountId = borrowed.accountId || undefined;
      const state = await CalculationService.getFinancialState(userId, targetAccountId);
      if (CalculationService.violatesBalanceRules(state.netSavings, state.actualBalance + repaymentChange)) {
        throw new BadRequestError('Insufficient balance in this account to repay this borrowed record.');
      }

      const result = await prisma.$transaction(async (tx) => {
        const loan = await tx.moneyBorrowed.update({
          where: { bid: borrowed.bid },
          data: { status: newStatus as any, paidAmount: new Prisma.Decimal(newPaid) },
        });

        let targetAccount = targetAccountId
          ? await tx.account.findFirst({ where: { aid: targetAccountId, uid: userId } })
          : await tx.account.findFirst({ where: { uid: userId, isDefault: true } }) || await tx.account.findFirst({ where: { uid: userId } });

        if (!targetAccount) {
          targetAccount = await tx.account.create({
            data: {
              uid: userId,
              name: 'Cash',
              type: 'CASH',
              balance: 0,
              initialBalance: 0,
              color: '#10b981',
              isDefault: true,
            },
          });
        }

        const account = await tx.account.update({
          where: { aid: targetAccount.aid },
          data: { balance: { increment: new Prisma.Decimal(repaymentChange) } },
        });
        return { loan: { ...loan, id: loan.bid, bid: loan.bid, accountId: targetAccount.aid }, account };
      });

      await cacheService.invalidateUserFinance(userId);

      return result;
    }

    throw new NotFoundError('Loan not found');
  }

  /**
   * Update full loan details and recalculate balances
   */
  static async updateLoan(userId: string | undefined, loanId: string, dto: UpdateLoanDto) {
    if (!userId) throw new UnauthorizedError();

    const { personName, amount, description, dueAt, status, kind, paidAmount, accountId } = dto;

    const lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
    const borrowed = !lent ? await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } }) : null;

    if (!lent && !borrowed) {
      throw new NotFoundError('Loan record not found');
    }

    const existing = lent || borrowed!;
    const existingKind = lent ? 'lent' : 'borrowed';
    const targetKind = kind && (kind === 'lent' || kind === 'borrowed') ? kind : existingKind;

    const targetAccountId = accountId !== undefined ? accountId : existing.accountId;

    const newAmount = amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0
      ? Number(amount)
      : Number(existing.amount);
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

    const newPersonName = personName ? sanitizeString(personName) || existing.personName : existing.personName;
    const newDescription = description !== undefined ? sanitizeString(description) : existing.description;
    const newDueAt = dueAt !== undefined ? (dueAt ? new Date(dueAt) : null) : existing.dueAt;

    const oldEffect = existingKind === 'lent' ? oldPaid - Number(existing.amount) : Number(existing.amount) - oldPaid;
    const newEffect = targetKind === 'lent' ? newPaid - newAmount : newAmount - newPaid;
    const balanceDelta = newEffect - oldEffect;

    const state = await CalculationService.getFinancialState(userId, targetAccountId || undefined);
    const oldNetEffect = existingKind === 'lent' ? oldEffect : 0;
    const newNetEffect = targetKind === 'lent' ? newEffect : 0;

    if (CalculationService.violatesBalanceRules(state.netSavings + newNetEffect - oldNetEffect, state.actualBalance + balanceDelta)) {
      throw new BadRequestError('Insufficient balance in this account to update this loan.');
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
              accountId: targetAccountId || null,
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
              accountId: targetAccountId || null,
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
              accountId: targetAccountId || null,
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
              accountId: targetAccountId || null,
            },
          });
        }
      }

      let targetAccount = targetAccountId
        ? await tx.account.findFirst({ where: { aid: targetAccountId, uid: userId } })
        : await tx.account.findFirst({ where: { uid: userId, isDefault: true } }) || await tx.account.findFirst({ where: { uid: userId } });

      if (!targetAccount) {
        targetAccount = await tx.account.create({
          data: {
            uid: userId,
            name: 'Cash',
            type: 'CASH',
            balance: 0,
            initialBalance: 0,
            color: '#10b981',
            isDefault: true,
          },
        });
      }

      const account = await tx.account.update({
        where: { aid: targetAccount.aid },
        data: { balance: { increment: new Prisma.Decimal(balanceDelta) } },
      });

      const updatedId = (updatedLoan as any).lid || (updatedLoan as any).bid;
      return { loan: { ...updatedLoan, id: updatedId, lid: (updatedLoan as any).lid, bid: (updatedLoan as any).bid, accountId: targetAccount.aid }, account };
    });

    await cacheService.invalidateUserFinance(userId);

    return result;
  }

  /**
   * Delete a loan record and reverse its balance effects
   */
  static async deleteLoan(userId: string | undefined, loanId: string) {
    if (!userId) throw new UnauthorizedError();

    const lent = await prisma.moneyLent.findFirst({ where: { lid: loanId, uid: userId } });
    const borrowed = !lent ? await prisma.moneyBorrowed.findFirst({ where: { bid: loanId, uid: userId } }) : null;

    if (!lent && !borrowed) {
      throw new NotFoundError('Loan record not found');
    }

    const existing = lent || borrowed!;
    const existingKind = lent ? 'lent' : 'borrowed';
    const oldAmountNum = Number(existing.amount);
    const oldPaid = Number((existing as any).paidAmount || (existing.status === 'PAID' ? oldAmountNum : 0));
    const oldEffect = existingKind === 'lent' ? oldPaid - oldAmountNum : oldAmountNum - oldPaid;
    const balanceDelta = -oldEffect;

    const targetAccountId = existing.accountId || undefined;
    const state = await CalculationService.getFinancialState(userId, targetAccountId);
    const netSavingsDelta = existingKind === 'lent' ? -oldEffect : 0;
    if (CalculationService.violatesBalanceRules(state.netSavings + netSavingsDelta, state.actualBalance + balanceDelta)) {
      throw new BadRequestError('Insufficient balance in this account to delete this loan.');
    }

    await prisma.$transaction(async (tx) => {
      if (existingKind === 'lent') {
        await tx.moneyLent.delete({ where: { lid: loanId } });
      } else {
        await tx.moneyBorrowed.delete({ where: { bid: loanId } });
      }

      let targetAccount = targetAccountId
        ? await tx.account.findFirst({ where: { aid: targetAccountId, uid: userId } })
        : await tx.account.findFirst({ where: { uid: userId, isDefault: true } }) || await tx.account.findFirst({ where: { uid: userId } });

      if (!targetAccount) {
        targetAccount = await tx.account.create({
          data: {
            uid: userId,
            name: 'Cash',
            type: 'CASH',
            balance: 0,
            initialBalance: 0,
            color: '#10b981',
            isDefault: true,
          },
        });
      }

      await tx.account.update({
        where: { aid: targetAccount.aid },
        data: { balance: { increment: new Prisma.Decimal(balanceDelta) } },
      });
    });

    await cacheService.invalidateUserFinance(userId);

    return { message: 'Loan deleted successfully' };
  }
}
