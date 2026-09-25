import { prisma } from '../config/db';
import { CalculationService } from '../services/calculationService';
import { cacheService } from '../services/cacheService';

async function backfillAccounts() {
  console.log('🚀 Starting account backfill and transaction migration...');

  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      transactions: true,
    },
  });

  console.log(`📊 Found ${users.length} user(s) to inspect.\n`);

  let totalMigratedTransactions = 0;
  let totalCreatedAccounts = 0;
  let totalRecalculatedAccounts = 0;

  for (const user of users) {
    console.log(`👤 Processing User: ${user.email} (UID: ${user.uid})`);

    let accounts = user.accounts;
    let primaryAccount = accounts.find((a) => a.isDefault) || accounts[0];

    // 1. Ensure at least one primary account exists
    if (!primaryAccount) {
      console.log(`   ➕ Creating default Primary Cash account for user ${user.uid}...`);
      primaryAccount = await prisma.account.create({
        data: {
          uid: user.uid,
          name: 'Cash',
          type: 'CASH',
          balance: 0,
          initialBalance: 0,
          color: '#10b981',
          isDefault: true,
        },
      });
      accounts = [primaryAccount];
      totalCreatedAccounts++;
    } else if (!primaryAccount.isDefault) {
      console.log(`   ⭐ Setting account "${primaryAccount.name}" (${primaryAccount.aid}) as default primary account...`);
      await prisma.account.update({
        where: { aid: primaryAccount.aid },
        data: { isDefault: true },
      });
      primaryAccount.isDefault = true;
    }

    // 2. Find transactions without an accountId or with unlinked accountId
    const validAccountIds = new Set(accounts.map((a) => a.aid));
    const unassignedTx = user.transactions.filter(
      (tx) => !tx.accountId || !validAccountIds.has(tx.accountId)
    );

    if (unassignedTx.length > 0) {
      console.log(`   🔗 Linking ${unassignedTx.length} unassigned transaction(s) to primary account "${primaryAccount.name}"...`);
      const unassignedIds = unassignedTx.map((tx) => tx.tid);

      await prisma.transaction.updateMany({
        where: {
          tid: { in: unassignedIds },
        },
        data: {
          accountId: primaryAccount.aid,
        },
      });

      totalMigratedTransactions += unassignedTx.length;
    } else {
      console.log(`   ✅ All transactions already linked to valid accounts.`);
    }

    // 2b. Link unassigned moneyLent and moneyBorrowed to primary account
    const unassignedLent = await prisma.moneyLent.findMany({
      where: { uid: user.uid, OR: [{ accountId: null }, { accountId: { notIn: Array.from(validAccountIds) } }] },
    });
    if (unassignedLent.length > 0) {
      console.log(`   🔗 Linking ${unassignedLent.length} unassigned Lent record(s) to primary account "${primaryAccount.name}"...`);
      await prisma.moneyLent.updateMany({
        where: { lid: { in: unassignedLent.map((l) => l.lid) } },
        data: { accountId: primaryAccount.aid },
      });
    }

    const unassignedBorrowed = await prisma.moneyBorrowed.findMany({
      where: { uid: user.uid, OR: [{ accountId: null }, { accountId: { notIn: Array.from(validAccountIds) } }] },
    });
    if (unassignedBorrowed.length > 0) {
      console.log(`   🔗 Linking ${unassignedBorrowed.length} unassigned Borrowed record(s) to primary account "${primaryAccount.name}"...`);
      await prisma.moneyBorrowed.updateMany({
        where: { bid: { in: unassignedBorrowed.map((b) => b.bid) } },
        data: { accountId: primaryAccount.aid },
      });
    }

    // 3. Recalculate balances for all accounts of this user
    for (const acc of accounts) {
      const [accTransactions, accLent, accBorrowed] = await Promise.all([
        prisma.transaction.findMany({
          where: { uid: user.uid, accountId: acc.aid },
          select: { type: true, amount: true },
        }),
        prisma.moneyLent.findMany({
          where: { uid: user.uid, accountId: acc.aid },
          select: { amount: true, paidAmount: true, status: true },
        }),
        prisma.moneyBorrowed.findMany({
          where: { uid: user.uid, accountId: acc.aid },
          select: { amount: true, paidAmount: true, status: true },
        }),
      ]);

      const txBalance = accTransactions.reduce(
        (sum, t) => sum + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)),
        0
      );

      const lentOutstanding = accLent.reduce(
        (sum, l) => sum + Math.max(0, Number(l.amount) - Number(l.paidAmount || (l.status === 'PAID' ? l.amount : 0))),
        0
      );

      const borrowedOutstanding = accBorrowed.reduce(
        (sum, b) => sum + Math.max(0, Number(b.amount) - Number(b.paidAmount || (b.status === 'PAID' ? b.amount : 0))),
        0
      );

      const computedBal = Number(acc.initialBalance) + txBalance - lentOutstanding + borrowedOutstanding;

      await prisma.account.update({
        where: { aid: acc.aid },
        data: { balance: computedBal },
      });

      console.log(`   💰 Account "${acc.name}": Initial ₹${Number(acc.initialBalance)} + Tx ₹${txBalance} - Lent ₹${lentOutstanding} + Borrowed ₹${borrowedOutstanding} = Balance ₹${computedBal}`);
      totalRecalculatedAccounts++;
    }

    // 4. Validate overall user financial rules
    const state = await CalculationService.getFinancialState(user.uid);
    const isViolating = CalculationService.violatesBalanceRules(state.netSavings, state.actualBalance);
    console.log(`   📈 Financial State: Net Savings = ₹${state.netSavings}, Actual Balance = ₹${state.actualBalance} (Rule Valid: ${!isViolating ? 'PASS' : 'WARNING'})`);

    // 5. Invalidate caches
    await cacheService.delete(`accounts:${user.uid}`);
    await cacheService.invalidateUserFinance(user.uid);
    console.log(`   🔄 Cache invalidated for user ${user.uid}.\n`);
  }

  console.log('====================================================');
  console.log(`🎉 Backfill completed successfully!`);
  console.log(`   • Users processed: ${users.length}`);
  console.log(`   • Default accounts created: ${totalCreatedAccounts}`);
  console.log(`   • Transactions migrated to primary: ${totalMigratedTransactions}`);
  console.log(`   • Account balances synchronized: ${totalRecalculatedAccounts}`);
  console.log('====================================================\n');
}

backfillAccounts()
  .catch((err) => {
    console.error('❌ Error during backfill:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
