import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AuthCallbackComponent } from './auth-callback.component';
import { AuthStore } from '../../store/auth.store';

const mockStore = {
  handleOAuthToken: vi.fn(),
};

function createComponent(token: string | null) {
  TestBed.configureTestingModule({
    imports: [AuthCallbackComponent],
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: mockStore },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: { get: vi.fn().mockReturnValue(token) } } },
      },
    ],
  });
  return TestBed.createComponent(AuthCallbackComponent);
}

describe('AuthCallbackComponent', () => {
  let router: Router;

  beforeEach(() => vi.clearAllMocks());

  it('calls handleOAuthToken and navigates to /dashboard when token is present', () => {
    const fixture = createComponent('my-token');
    router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();

    expect(mockStore.handleOAuthToken).toHaveBeenCalledWith('my-token');
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('navigates to / when no token in query params', () => {
    const fixture = createComponent(null);
    router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();

    expect(mockStore.handleOAuthToken).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });
});
