import { getDb } from '../../db/client.js';
import { walletsRepository } from './wallets.repository.js';
import { activityLogsService } from '../activity-logs/activity-logs.service.js';
import { ActivityActions, TrackableTypes } from '../../db/activity.constants.js';
import type {
  CreateWalletInput,
  WalletQuery,
  MemberWalletTransactionsQuery,
  MasterWalletTransactionsQuery
} from './wallets.validators.js';
import type { Env } from '../../config/env.js';
import {
  WalletTransactionDirection,
  MasterWalletTransactionType,
  MemberWalletTransactionType,
  MemberPayoutType
} from './wallets.validators.js';

function toMoneyString(value: number): string {
  return Number(value).toFixed(2);
}

export const walletsService = {
  async getMasterWallet(env: Env, storeId: string) {
    return walletsRepository.getMasterWallet(env, storeId);
  },

  async createMasterWallet(env: Env, storeId: string, data: CreateWalletInput) {
    return walletsRepository.createMasterWallet(env, storeId, data);
  },

  async getMemberWallet(env: Env, storeId: string, memberUserId: string) {
    return walletsRepository.getMemberWallet(env, storeId, memberUserId);
  },

  async createMemberWallet(env: Env, data: { storeId: string; memberUserId: string; balance?: string; createdBy?: string }) {
    return walletsRepository.createMemberWallet(env, data);
  },

  async findAllMemberWallets(env: Env, query: WalletQuery) {
    const { page, limit, storeId } = query;
    const data = await walletsRepository.getMemberWalletsWithUserInfo(env, storeId, page, limit);
    return { data, total: data.length };
  },

  async updateMasterWalletBalance(env: Env, storeId: string, newBalance: string) {
    return walletsRepository.updateMasterWalletBalance(env, storeId, newBalance);
  },

  async updateMemberWalletBalance(env: Env, id: string, newBalance: string) {
    return walletsRepository.updateMemberWalletBalance(env, id, newBalance);
  },

  async getMasterWalletTransactions(env: Env, query: MasterWalletTransactionsQuery) {
    return walletsRepository.getMasterWalletTransactions(env, query);
  },

  async getMemberWalletTransactions(env: Env, query: MemberWalletTransactionsQuery) {
    return walletsRepository.getMemberWalletTransactions(env, query);
  },

  async getExpenseCategoriesByStoreId(env: Env, storeId: string) {
    return walletsRepository.getExpenseCategoriesByStoreId(env, storeId);
  },

  async createExpenseCategory(env: Env, data: any) {
    return walletsRepository.createExpenseCategory(env, data);
  },

  async updateExpenseCategory(env: Env, id: string, data: any) {
    return walletsRepository.updateExpenseCategory(env, id, data);
  },

  async rechargeMasterWallet(env: Env, storeId: string, amount: number, note: string | undefined, createdBy: string) {
    const wallet = await walletsRepository.getMasterWallet(env, storeId);
    if (!wallet) {
      throw new Error('Master wallet not found');
    }

    const previousBalance = Number(wallet.balance ?? 0);
    const newBalance = previousBalance + amount;

    const updatedWallet = await walletsRepository.updateMasterWalletBalance(env, storeId, toMoneyString(newBalance));

    const transaction = await walletsRepository.createMasterWalletTransaction(env, {
      storeId,
      masterWalletId: wallet.id,
      type: MasterWalletTransactionType.ManualAdjustmentCredit,
      direction: WalletTransactionDirection.CREDIT,
      amount: toMoneyString(amount),
      previousBalance: toMoneyString(previousBalance),
      newBalance: toMoneyString(newBalance),
      note: note?.trim() || "Manual wallet recharge",
      createdBy,
    });

    await activityLogsService.create(env, {
      storeId,
      trackableType: TrackableTypes.MASTER_WALLETS,
      trackableId: wallet.id,
      action: ActivityActions.MASTER_WALLET_CREDITED,
      createdBy,
      metadata: {
        previousBalance,
        newBalance: Number(updatedWallet?.balance ?? 0),
        transactionId: transaction?.id,
        amount,
        note,
      },
    });

    return { wallet: updatedWallet, transaction };
  },

  async addMasterWalletExpense(env: Env, storeId: string, expenseCategoryId: string, amount: number, note: string | undefined, createdBy: string) {
    const category = await walletsRepository.getExpenseCategoryById(env, expenseCategoryId, storeId);
    if (!category || !category.isActive) {
      throw new Error('Expense category not found or inactive');
    }

    const wallet = await walletsRepository.getMasterWallet(env, storeId);
    if (!wallet) {
      throw new Error('Master wallet not found');
    }

    const previousBalance = Number(wallet.balance ?? 0);
    const newBalance = previousBalance - amount;

    if (newBalance < 0) {
      throw new Error('Insufficient master wallet balance');
    }

    const updatedWallet = await walletsRepository.updateMasterWalletBalance(env, storeId, toMoneyString(newBalance));

    const transaction = await walletsRepository.createMasterWalletTransaction(env, {
      storeId,
      masterWalletId: wallet.id,
      type: MasterWalletTransactionType.ExpenseDebit,
      direction: WalletTransactionDirection.DEBIT,
      amount: toMoneyString(amount),
      previousBalance: toMoneyString(previousBalance),
      newBalance: toMoneyString(newBalance),
      expenseCategoryId,
      note: note?.trim() || `Expense: ${category.name}`,
      createdBy,
    });

    await activityLogsService.create(env, {
      storeId,
      trackableType: TrackableTypes.MASTER_WALLETS,
      trackableId: wallet.id,
      action: ActivityActions.EXPENSE_CREATED,
      createdBy,
      metadata: {
        previousBalance,
        newBalance: Number(updatedWallet.balance),
        transactionId: transaction.id,
        expenseCategoryId,
        amount,
        note,
      },
    });

    return { wallet: updatedWallet, transaction };
  },

  async recordCustomerPayment(env: Env, storeId: string, customerId: string, amount: number, note: string | undefined, orderId: string | undefined, createdBy: string) {
    const customer = await walletsRepository.getCustomerById(env, customerId, storeId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const wallet = await walletsRepository.getMasterWallet(env, storeId);
    if (!wallet) {
      throw new Error('Master wallet not found');
    }

    const previousBalance = Number(wallet.balance ?? 0);
    const newBalance = previousBalance + amount;

    const updatedWallet = await walletsRepository.updateMasterWalletBalance(env, storeId, toMoneyString(newBalance));

    const transaction = await walletsRepository.createMasterWalletTransaction(env, {
      storeId,
      masterWalletId: wallet.id,
      type: MasterWalletTransactionType.CustomerPaymentCredit,
      direction: WalletTransactionDirection.CREDIT,
      amount: toMoneyString(amount),
      previousBalance: toMoneyString(previousBalance),
      newBalance: toMoneyString(newBalance),
      customerId,
      orderId,
      note: note?.trim() || `Payment received from ${customer.name}`,
      createdBy,
    });

    await activityLogsService.create(env, {
      storeId,
      trackableType: TrackableTypes.MASTER_WALLETS,
      trackableId: wallet.id,
      action: ActivityActions.MASTER_WALLET_CREDITED,
      createdBy,
      metadata: {
        previousBalance,
        newBalance: Number(updatedWallet.balance),
        transactionId: transaction.id,
        customerId,
        amount,
        note,
      },
    });

    return { wallet: updatedWallet, transaction };
  },

  async payoutMember(env: Env, storeId: string, memberUserId: string, amount: number, payoutType: (typeof MemberPayoutType)[keyof typeof MemberPayoutType], note: string | undefined, orderId: string | undefined, createdBy: string) {
    const memberRole = await walletsRepository.getMemberRole(env, storeId, memberUserId);
    if (!memberRole) {
      throw new Error('Selected member does not belong to this store');
    }

    const masterWallet = await walletsRepository.getMasterWallet(env, storeId);
    if (!masterWallet) {
      throw new Error('Master wallet not found');
    }

    const masterPrevious = Number(masterWallet.balance ?? 0);
    const masterNext = masterPrevious - amount;

    if (masterNext < 0) {
      throw new Error('Insufficient master wallet balance');
    }

    const updatedMasterWallet = await walletsRepository.updateMasterWalletBalance(env, storeId, toMoneyString(masterNext));

    const masterTx = await walletsRepository.createMasterWalletTransaction(env, {
      storeId,
      masterWalletId: masterWallet.id,
      type: MasterWalletTransactionType.MemberPayoutDebit,
      direction: WalletTransactionDirection.DEBIT,
      amount: toMoneyString(amount),
      previousBalance: toMoneyString(masterPrevious),
      newBalance: toMoneyString(masterNext),
      memberUserId,
      orderId,
      note: note?.trim() || `Member ${payoutType} payout transfer`,
      createdBy,
    });

    const memberWallet = await walletsRepository.getMemberWallet(env, storeId, memberUserId);
    if (!memberWallet) {
      throw new Error('Member wallet not found');
    }

    const memberPrevious = Number(memberWallet.balance ?? 0);
    const memberNext = memberPrevious + amount;

    const updatedMemberWallet = await walletsRepository.updateMemberWalletBalance(env, memberWallet.id, toMoneyString(memberNext));

    const memberType = payoutType === MemberPayoutType.Salary
      ? MemberWalletTransactionType.SalaryCredit
      : payoutType === MemberPayoutType.Commission
      ? MemberWalletTransactionType.CommissionCredit
      : MemberWalletTransactionType.BonusCredit;

    const memberTx = await walletsRepository.createMemberWalletTransaction(env, {
      storeId,
      memberWalletId: memberWallet.id,
      memberUserId,
      type: memberType,
      direction: WalletTransactionDirection.CREDIT,
      amount: toMoneyString(amount),
      previousBalance: toMoneyString(memberPrevious),
      newBalance: toMoneyString(memberNext),
      masterWalletTransactionId: masterTx.id,
      orderId,
      note: note?.trim() || `Received ${payoutType} payout from master wallet`,
      createdBy,
    });

    await activityLogsService.create(env, {
      storeId,
      trackableType: TrackableTypes.MASTER_WALLETS,
      trackableId: masterWallet.id,
      action: ActivityActions.MEMBER_PAYOUT_CREATED,
      createdBy,
      metadata: {
        masterPreviousBalance: masterPrevious,
        masterNewBalance: Number(updatedMasterWallet.balance),
        memberPreviousBalance: memberPrevious,
        memberNewBalance: Number(updatedMemberWallet.balance),
        memberWalletId: memberWallet.id,
        masterTransactionId: masterTx.id,
        memberTransactionId: memberTx.id,
        memberUserId,
        payoutType,
        amount,
      },
    });

    return {
      masterWallet: updatedMasterWallet,
      memberWallet: updatedMemberWallet,
      masterTransaction: masterTx,
      memberTransaction: memberTx
    };
  },
};