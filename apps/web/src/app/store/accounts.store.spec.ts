import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { AccountsStore } from './accounts.store';
import { AccountService } from '../services/account.service';
import { TransactionService } from '../services/transaction.service';
import type { AccountListItem, AccountSortField, SortOrder } from '../services/account.service';
import type { TransactionItem } from '../services/transaction.service';

const mockAccountService = { listAccounts: vi.fn() };
const mockTxService = { getAccountTransactions: vi.fn() };

const mockAccount: AccountListItem = {
  id: 'acc-1',
  accountNumber: 'FD001',
  fullName: 'Diego Burgos',
  balance: 1000,
  type: 'BASIC',
  status: 'ACTIVE',
};

const mockTx: TransactionItem = {
  id: 'tx-1',
  fromAccount: 'FD001',
  fromName: 'Diego Burgos',
  toAccount: 'FD002',
  toName: 'María López',
  amount: 100,
  commission: 2,
  totalDeducted: 102,
  status: 'COMPLETED',
  authorizationCode: 'AUTH-001',
  createdAt: '2025-01-01T00:00:00Z',
  direction: 'OUTGOING',
};

const defaultLoadParams = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt' as AccountSortField,
  sortOrder: 'desc' as SortOrder,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      { provide: AccountService, useValue: mockAccountService },
      { provide: TransactionService, useValue: mockTxService },
    ],
  });
  return TestBed.inject(AccountsStore);
}

describe('AccountsStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initializes with empty accounts and no selected account', () => {
    const store = setup();
    expect(store.accounts()).toEqual([]);
    expect(store.total()).toBe(0);
    expect(store.loading()).toBe(false);
    expect(store.selectedAccount()).toBeNull();
    expect(store.sidebarTxs()).toEqual([]);
  });

  // ── load() ──────────────────────────────────────────────────────────────────

  describe('load()', () => {
    it('sets accounts and total on success', () => {
      mockAccountService.listAccounts.mockReturnValue(
        of({ data: [mockAccount], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }),
      );
      const store = setup();

      store.load(defaultLoadParams);

      expect(store.accounts()).toHaveLength(1);
      expect(store.accounts()[0]).toEqual(mockAccount);
      expect(store.total()).toBe(1);
      expect(store.loading()).toBe(false);
    });

    it('sets loading to true before response arrives', () => {
      mockAccountService.listAccounts.mockReturnValue(NEVER);
      const store = setup();

      store.load(defaultLoadParams);

      expect(store.loading()).toBe(true);
    });

    it('clears loading on error', () => {
      mockAccountService.listAccounts.mockReturnValue(throwError(() => new Error('Fail')));
      const store = setup();

      store.load(defaultLoadParams);

      expect(store.loading()).toBe(false);
    });

    it('passes search and status filters to AccountService', () => {
      mockAccountService.listAccounts.mockReturnValue(
        of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
      );
      const store = setup();
      const params = { ...defaultLoadParams, search: '12345', status: 'ACTIVE' };

      store.load(params);

      expect(mockAccountService.listAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ search: '12345', status: 'ACTIVE' }),
      );
    });
  });

  // ── openSidebar() ───────────────────────────────────────────────────────────

  describe('openSidebar()', () => {
    it('sets the selectedAccount and clears prior sidebarTxs', () => {
      mockTxService.getAccountTransactions.mockReturnValue(
        of({ data: [mockTx], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
      );
      const store = setup();

      store.openSidebar(mockAccount);

      expect(store.selectedAccount()).toEqual(mockAccount);
    });

    it('loads sidebar transactions for page 1', () => {
      mockTxService.getAccountTransactions.mockReturnValue(
        of({ data: [mockTx], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
      );
      const store = setup();

      store.openSidebar(mockAccount);

      expect(mockTxService.getAccountTransactions).toHaveBeenCalledWith('acc-1', 1, 10);
      expect(store.sidebarTxs()).toHaveLength(1);
      expect(store.sidebarTotal()).toBe(1);
    });
  });

  // ── loadSidebarTxs() ────────────────────────────────────────────────────────

  describe('loadSidebarTxs()', () => {
    it('sets sidebarLoading to true before response', () => {
      mockTxService.getAccountTransactions.mockReturnValue(NEVER);
      const store = setup();

      store.loadSidebarTxs('acc-1', 1);

      expect(store.sidebarLoading()).toBe(true);
    });

    it('clears sidebarLoading on error', () => {
      mockTxService.getAccountTransactions.mockReturnValue(throwError(() => new Error('Fail')));
      const store = setup();

      store.loadSidebarTxs('acc-1', 1);

      expect(store.sidebarLoading()).toBe(false);
    });

    it('uses sidebarLimit of 10', () => {
      mockTxService.getAccountTransactions.mockReturnValue(
        of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
      );
      const store = setup();

      store.loadSidebarTxs('acc-1', 2);

      expect(mockTxService.getAccountTransactions).toHaveBeenCalledWith('acc-1', 2, 10);
    });
  });

  // ── closeSidebar() ──────────────────────────────────────────────────────────

  describe('closeSidebar()', () => {
    it('clears selectedAccount, sidebarTxs and sidebarTotal', () => {
      mockTxService.getAccountTransactions.mockReturnValue(
        of({ data: [mockTx], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
      );
      const store = setup();
      store.openSidebar(mockAccount);
      expect(store.selectedAccount()).not.toBeNull();

      store.closeSidebar();

      expect(store.selectedAccount()).toBeNull();
      expect(store.sidebarTxs()).toEqual([]);
      expect(store.sidebarTotal()).toBe(0);
    });
  });
});
