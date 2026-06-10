import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router } from './router';
import { hasValidAuthenticatedSession } from '@/global-services/auth';
import { replace } from 'react-router-dom';

vi.mock('react-router-dom', () => ({
  createBrowserRouter: vi.fn().mockImplementation((routes) => routes),
  replace: vi.fn().mockImplementation((path) => ({ type: 'replace', path }))
}));

vi.mock('@/global-services/auth', () => ({
  hasValidAuthenticatedSession: vi.fn()
}));

vi.mock('@/pages/landing/landing.meta', () => ({ LandingRoute: { path: '/' } }));
vi.mock('@/app/layouts/navigation.meta', () => ({ NavigationBarRoute: { element: 'Nav' } }));
vi.mock('@/pages/home/home.meta', () => ({ HomeRoute: { path: '/home' } }));
vi.mock('@/pages/about/about.meta', () => ({ AboutRoute: { path: '/about' }, AuthAboutRoute: { path: '/auth-about' } }));
vi.mock('@/pages/dashboard/dashboard.meta', () => ({ DashboardRoute: { path: '/dashboard' } }));
vi.mock('@/pages/settings/settings.meta', () => ({ SettingsRoute: { path: '/settings' } }));
vi.mock('@/pages/Resume/resume.meta', () => ({ ResumeRoute: { path: '/resume' } }));

describe('router exhaustive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requireAuth loader redirects if not authenticated', async () => {
    const requireAuth = (router as any).find((r: any) => r.element === 'Nav').loader;
    (hasValidAuthenticatedSession as any).mockResolvedValue(false);
    
    await expect(requireAuth()).rejects.toEqual({ type: 'replace', path: '/' });
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('requireAuth loader returns null if authenticated', async () => {
    const requireAuth = (router as any).find((r: any) => r.element === 'Nav').loader;
    (hasValidAuthenticatedSession as any).mockResolvedValue(true);
    
    expect(await requireAuth()).toBeNull();
  });

  it('redirectAuthenticatedAbout loader redirects if authenticated', async () => {
    const loader = (router as any).find((r: any) => r.path === '/about').loader;
    (hasValidAuthenticatedSession as any).mockResolvedValue(true);
    
    await expect(loader()).rejects.toEqual({ type: 'replace', path: '/auth-about' });
  });

  it('redirectAuthenticatedAbout loader returns null if not authenticated', async () => {
    const loader = (router as any).find((r: any) => r.path === '/about').loader;
    (hasValidAuthenticatedSession as any).mockResolvedValue(false);
    
    expect(await loader()).toBeNull();
  });

  it('redirectToCanonical works', async () => {
    const aboutWildcard = (router as any).find((r: any) => r.path === '/about/*');
    const loader = aboutWildcard.loader;
    const mockRequest = { url: 'http://localhost/about/something?q=1' };
    
    const res = loader({ request: mockRequest });
    expect(res).toEqual({ type: 'replace', path: '/about?q=1' });
    expect(replace).toHaveBeenCalledWith('/about?q=1');
  });
});
