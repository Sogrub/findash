import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TransfersStore } from './transfers.store';
import { AccountService } from '../services/account.service';
import { TransactionService } from '../services/transaction.service';
import type { TransferPayload, TransferResult, TransactionItem } from '../services/transaction.service';

const mockAccountService = { getMyAccount: vi.fn() };
const mockTxService = {
  createTransfer: vi.fn(),
  getMyTransactions: vi.fn(),
};

const mockAccountInfo = { accountNumber: 'FD001', balance: 1500, type: 'BASIC', status: 'ACTIVE' };

const mockTransferResult: TransferResult = {
  id: 'tx-1',
  fromAccount: 'SRC001',
  fromName: 'Alice',
  toAccount: 'DST001',
  toName: 'Bob',
  amount: 200,
  commission: 4,
  totalDeducted: 204,
  status: 'COMPLETED',
  authorizationCode: 'AUTH-XYZ',
  createdAt: '2025-01-01T00:00:00Z',
};

const mockTxItem: TransactionItem = {
  ...mockTransferResult,
  direction: 'OUTGOING',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      { provide: AccountService, useValue: mockAccountService },
      { provide: TransactionService, useValue: mockTxService },
    ],
  });
  return TestBed.inject(TransfersStore);
}

describe('TransfersStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initializes with null balance and empty transactions', () => {
    const store = setup();
    expect(store.balance()).toBeNull();
    expect(store.accountType()).toBeNull();
    expect(store.transactions()).toEqual([]);
    expect(store.transferSuccess()).toBe(false);
    expect(store.transferError()).toBeNull();
  });

  // ── loadBalance() ───────────────────────────────────────────────────────────

  describe('loadBalance()', () => {
    it('sets balance and accountType from API response', () => {
      mockAccountService.getMyAccount.mockReturnValue(of(mockAccountInfo));
      const store = setup();

      store.loadBalance();

      expect(store.balance()).toBe(1500);
      expect(store.accountType()).toBe('BASIC');
    });
  });

  // ── loadHistory() ───────────────────────────────────────────────────────────

  describe('loadHistory()', () => {
    it('sets transactions and total from paginated response', () => {
      mockTxService.getMyTransactions.mockReturnValue(
        of({ data: [mockTxItem], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } }),
      );
      const store = setup();

      store.loadHistory(1, 10);

      expect(store.transactions()).toHaveLength(1);
      expect(store.totalTx()).toBe(1);
      expect(store.historyLoading()).toBe(false);
    });

    it('sets historyLoading to true before request completes', () => {
      mockTxService.getMyTransactions.mockReturnValue(NEVER);
      const store = setup();

      store.loadHistory(1, 10);

      expect(store.historyLoading()).toBe(true);
    });

    it('clears historyLoading on error', () => {
      mockTxService.getMyTransactions.mockReturnValue(
        throwError(() => new Error('Network error')),
      );
      const store = setup();

      store.loadHistory(1, 10);

      expect(store.historyLoading()).toBe(false);
    });
  });

  // ── submitTransfer() ────────────────────────────────────────────────────────

  describe('submitTransfer()', () => {
    const payload: TransferPayload = { toAccountNumber: 'DST001', amount: 200 };
    const onSuccess = vi.fn();

    beforeEach(() => {
      mockAccountService.getMyAccount.mockReturnValue(of(mockAccountInfo));
    });

    it('sets transferSuccess and lastTransfer on successful transfer', () => {
      mockTxService.createTransfer.mockReturnValue(of(mockTransferResult));
      const store = setup();

      store.submitTransfer('key-1', payload, onSuccess);

      expect(store.transferSuccess()).toBe(true);
      expect(store.lastTransfer()).toEqual(mockTransferResult);
      expect(store.transferLoading()).toBe(false);
    });

    it('calls onSuccess callback after transfer completes', () => {
      mockTxService.createTransfer.mockReturnValue(of(mockTransferResult));
      const store = setup();

      store.submitTransfer('key-1', payload, onSuccess);

      expect(onSuccess).toHaveBeenCalled();
    });

    it('refreshes balance after transfer', () => {
      mockTxService.createTransfer.mockReturnValue(of(mockTransferResult));
      const store = setup();

      store.submitTransfer('key-1', payload, onSuccess);

      expect(mockAccountService.getMyAccount).toHaveBeenCalledTimes(1);
    });

    it('sets transferError with API string message on failure', () => {
      const err = new HttpErrorResponse({ error: { message: 'Saldo insuficiente' }, status: 422 });
      mockTxService.createTransfer.mockReturnValue(throwError(() => err));
      const store = setup();

      store.submitTransfer('key-1', payload, onSuccess);

      expect(store.transferError()).toBe('Saldo insuficiente');
      expect(store.transferLoading()).toBe(false);
    });

    it('sets fallback error message when API error has no message string', () => {
      const err = new HttpErrorResponse({ error: { code: 500 }, status: 500 });
      mockTxService.createTransfer.mockReturnValue(throwError(() => err));
      const store = setup();

      store.submitTransfer('key-1', payload, onSuccess);

      expect(store.transferError()).toBe('Error al procesar la transferencia');
    });

    it('clears transferError before each submission', () => {
      const err = new HttpErrorResponse({ error: { message: 'Error 1' }, status: 400 });
      mockTxService.createTransfer
        .mockReturnValueOnce(throwError(() => err))
        .mockReturnValueOnce(of(mockTransferResult));

      const store = setup();

      store.submitTransfer('key-1', payload, vi.fn());
      expect(store.transferError()).toBe('Error 1');

      store.submitTransfer('key-2', payload, onSuccess);
      expect(store.transferError()).toBeNull();
    });
  });

  // ── clearSuccess() ──────────────────────────────────────────────────────────

  describe('clearSuccess()', () => {
    it('resets transferSuccess, lastTransfer and transferError', () => {
      mockTxService.createTransfer.mockReturnValue(of(mockTransferResult));
      mockAccountService.getMyAccount.mockReturnValue(of(mockAccountInfo));
      const store = setup();

      store.submitTransfer('key-1', { toAccountNumber: 'DST001', amount: 100 }, vi.fn());
      expect(store.transferSuccess()).toBe(true);

      store.clearSuccess();

      expect(store.transferSuccess()).toBe(false);
      expect(store.lastTransfer()).toBeNull();
      expect(store.transferError()).toBeNull();
    });
  });
});
