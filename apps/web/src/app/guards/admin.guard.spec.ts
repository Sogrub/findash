import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthStore } from '../store/auth.store';

const mockStore = { currentUser: vi.fn() };

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: mockStore },
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  return { router };
}

describe('adminGuard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows access when role is ADMIN', () => {
    const { router } = setup();
    mockStore.currentUser.mockReturnValue({ role: 'ADMIN' });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to /dashboard when role is CLIENT', () => {
    const { router } = setup();
    mockStore.currentUser.mockReturnValue({ role: 'CLIENT' });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('redirects to /dashboard when not authenticated', () => {
    const { router } = setup();
    mockStore.currentUser.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
