import { z } from 'zod';

export const createWalletSchema = z.object({
  balance: z.number().or(z.string()).default(0),
  createdBy: z.string().optional(),
});

export const walletQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  storeId: z.string().uuid(),
});

// Transaction types
export const WalletTransactionDirection = {
  CREDIT: "credit",
  DEBIT: "debit",
} as const;

export const MasterWalletTransactionType = {
  CustomerPaymentCredit: "customer_payment_credit",
  ExpenseDebit: "expense_debit",
  MemberPayoutDebit: "member_payout_debit",
  ManualAdjustmentCredit: "manual_adjustment_credit",
  ManualAdjustmentDebit: "manual_adjustment_debit",
} as const;

export const MemberWalletTransactionType = {
  SalaryCredit: "salary_credit",
  CommissionCredit: "commission_credit",
  BonusCredit: "bonus_credit",
  ManualAdjustmentCredit: "manual_adjustment_credit",
  ManualAdjustmentDebit: "manual_adjustment_debit",
} as const;

export const MemberPayoutType = {
  Salary: "salary",
  Commission: "commission",
  Bonus: "bonus",
} as const;

// Expense Category schemas
export const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
});

export const updateExpenseCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

// Financial action schemas
const amountSchema = z
  .coerce.number()
  .finite("Amount must be a valid number.")
  .positive("Amount must be greater than 0.")
  .refine((value) => Math.round(value * 100) === value * 100, {
    message: "Amount can have at most 2 decimal places.",
  });

export const rechargeMasterWalletSchema = z.object({
  amount: amountSchema,
  note: z.string().trim().max(500).optional(),
});

export const addMasterWalletExpenseSchema = z.object({
  expenseCategoryId: z.string().uuid(),
  amount: amountSchema,
  note: z.string().trim().max(500).optional(),
});

export const recordCustomerPaymentToMasterWalletSchema = z.object({
  customerId: z.string().uuid(),
  amount: amountSchema,
  note: z.string().trim().max(500).optional(),
  orderId: z.string().uuid().optional(),
});

export const payoutMemberFromMasterWalletSchema = z.object({
  memberUserId: z.string().min(1),
  amount: amountSchema,
  payoutType: z.nativeEnum(MemberPayoutType),
  note: z.string().trim().max(500).optional(),
  orderId: z.string().uuid().optional(),
});

// Query schemas
export const memberWalletTransactionsQuerySchema = z.object({
  storeId: z.string().uuid(),
  memberUserId: z.string().min(1),
  page: z.number().default(1),
  limit: z.number().default(100),
});

export const masterWalletTransactionsQuerySchema = z.object({
  storeId: z.string().uuid(),
  page: z.number().default(1),
  limit: z.number().default(50),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type WalletQuery = z.infer<typeof walletQuerySchema>;
export type MemberWalletTransactionsQuery = z.infer<typeof memberWalletTransactionsQuerySchema>;
export type MasterWalletTransactionsQuery = z.infer<typeof masterWalletTransactionsQuerySchema>;