'use client';
import { Button, Dialog, Dropdown, DropdownItem, LoadingLabel } from '@/components/ui/primitives';
import { productConfig } from '@/lib/mock-data/merchant';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Menu,
  Mountain,
  Plug,
  ScanLine,
  Settings2,
  Target,
  Terminal,
  Users,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from '@/app/auth/actions';
import { useApp } from './app-provider';
import { useGateway, useStorefrontContext } from '@/components/gateway/provider';
const navigation = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    routes: ['/dashboard', '/scan', '/sessions', '/replays'],
  },
  { href: '/demand-signal', label: 'Demand Signal', icon: Users },
  { href: '/recommendations', label: 'Findings', icon: Wand2 },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: ChartNoAxesCombined,
    routes: ['/analytics', '/roi'],
  },
  { href: '/pitch', label: 'Why This Matters', icon: Target },
];
const settingsNavigation = {
  href: '/settings',
  label: 'Settings',
  icon: Settings2,
  routes: ['/settings', '/integrations', '/security'],
};
function navigationActive(item: { href: string; routes?: string[] }, path: string) {
  return (item.routes || [item.href]).some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}
export function GatewayLogo({ small = false }: { small?: boolean }) {
  return (
    <span className={cn('gateway-logo', small && 'small')} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
export function AppSidebar({
  open,
  onClose,
  onHelp,
}: {
  open: boolean;
  onClose: () => void;
  onHelp: () => void;
}) {
  const path = usePathname();
  const { hostname } = useStorefrontContext();
  return (
    <>
      <button
        aria-label="Close navigation"
        className={cn('sidebar-backdrop', open && 'visible')}
        onClick={onClose}
      />
      <aside className={cn('sidebar', open && 'open')}>
        <Link href="/dashboard" className="brand" onClick={onClose}>
          <GatewayLogo />
          <span>
            {productConfig.name}
            <span className="brand-beta">BETA</span>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-icon">
            <Mountain size={17} />
          </span>
          <div>
            <strong>{hostname || 'Your workspace'}</strong>
            <span>Storefront workspace</span>
          </div>
          <ChevronsUpDown size={13} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn('nav-item', navigationActive(item, path) && 'active')}
              aria-current={navigationActive(item, path) ? 'page' : undefined}
            >
              <item.icon size={17} strokeWidth={1.7} />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="nav-divider" />
          {[settingsNavigation].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn('nav-item', navigationActive(item, path) && 'active')}
              aria-current={navigationActive(item, path) ? 'page' : undefined}
            >
              <item.icon size={17} strokeWidth={1.7} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-health">
            <span className="live-dot" />
            Read-only shopper testing
            <ArrowUpRight size={12} />
          </div>
          <div className="plan-card">
            <div>
              <span className="plan-icon">
                <Building2 size={15} />
              </span>
              <strong>{productConfig.plan}</strong>
              <span className="plan-label">ACTIVE</span>
            </div>
            <p>Built for your next channel.</p>
            <Link href="/settings">
              Manage workspace
              <ArrowRightSmall />
            </Link>
          </div>
          <button className="help-link" onClick={onHelp}>
            <BookOpen size={16} />
            Documentation
            <ArrowUpRight size={13} />
          </button>
          <div className="sidebar-footer">
            <span>© 2026 {productConfig.name}</span>
            <span>v0.1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
function ArrowRightSmall() {
  return <ArrowUpRight size={12} />;
}
export function MerchantSelector() {
  const { hostname } = useStorefrontContext();
  return (
    <Link href="/discover" className="merchant-selector">
      <span className="merchant-avatar">
        <Mountain size={17} />
      </span>
      <strong>{hostname || 'Choose a storefront'}</strong>
      <ChevronDown size={13} />
    </Link>
  );
}
export function EnvironmentSelector() {
  const { environmentId: environment } = useStorefrontContext();
  return (
    <Link className="environment-selector" href="/discover">
      {environment || 'Select environment'}
    </Link>
  );
}
export function ScanButton({ outline = false }: { outline?: boolean }) {
  const { runScan, scanning } = useApp();
  return (
    <Button variant={outline ? 'outline' : 'default'} onClick={runScan} disabled={scanning}>
      {scanning ? (
        <LoadingLabel>Scanning…</LoadingLabel>
      ) : (
        <>
          <ScanLine size={14} />
          {outline ? 'Run new scan' : 'Run Scan'}
        </>
      )}
    </Button>
  );
}
export function TopNavigation({ onMenu }: { onMenu: () => void }) {
  const [notifications, setNotifications] = useState(false);
  const [identity, setIdentity] = useState('Your account');
  const { notify } = useApp();
  const { dashboard } = useGateway();
  const latest = dashboard?.scans[0];
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/account', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const account = await response.json();
        setIdentity(account.profile.full_name || account.user.email);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <header className="top-navigation">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation">
        <Menu size={21} />
      </button>
      <MerchantSelector />
      <span className="topbar-divider" />
      <span className="topbar-domain">
        <Globe2 size={13} />
        Test environment
      </span>
      <EnvironmentSelector />
      <div className="topbar-right">
        <ScanButton />
        <span className="topbar-divider" />
        <button
          className="notification-button"
          aria-label="Notifications"
          onClick={() => setNotifications(true)}
        >
          <Bell size={18} />
          <i />
        </button>
        <Dropdown
          align="end"
          trigger={
            <button className="user-menu">
              <span className="avatar">
                {identity
                  .split(/\s+/)
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <span>
                <strong>{identity}</strong>
                <small>Member</small>
              </span>
              <ChevronDown size={12} />
            </button>
          }
        >
          <div className="dropdown-label">{identity}</div>
          <DropdownItem
            onSelect={() => {
              void signOut().then((result) => {
                if (result?.error) notify(result.error);
              });
            }}
          >
            Sign out
          </DropdownItem>
          <DropdownItem onSelect={() => window.location.assign('/settings')}>
            <Settings2 size={14} />
            Workspace settings
          </DropdownItem>
          <DropdownItem onSelect={() => window.location.assign('/integrations')}>
            <Plug size={14} />
            Manage integrations
          </DropdownItem>
        </Dropdown>
      </div>
      <Dialog
        open={notifications}
        onOpenChange={setNotifications}
        title="Notifications"
        description="Recent activity in your commerce workspace."
      >
        {latest ? (
          <div className="notification-item">
            <span className="icon-box blue">
              <Check size={18} />
            </span>
            <div>
              <strong>Latest scan: {latest.status}</strong>
              <p>
                {latest.merchantUrl} · {latest.sessionCount} sessions
              </p>
              <Link href={`/scan?scanId=${latest.id}`} onClick={() => setNotifications(false)}>
                Inspect scan →
              </Link>
            </div>
          </div>
        ) : (
          <p>No scans have been recorded yet.</p>
        )}
      </Dialog>
    </header>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const { scanning, scanProgress } = useApp();
  const pathname = usePathname();
  const current = [...navigation, settingsNavigation].find((item) =>
    navigationActive(item, pathname),
  );
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/discover' ||
    pathname === '/scanning' ||
    pathname.startsWith('/auth/')
  )
    return <>{children}</>;
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <AppSidebar open={open} onClose={() => setOpen(false)} onHelp={() => setHelp(true)} />
      <div className="app-body">
        <TopNavigation onMenu={() => setOpen(true)} />
        {scanning && (
          <div
            className="scan-progress"
            role="progressbar"
            aria-label="Readiness scan progress"
            aria-valuenow={scanProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${scanProgress}%` }} />
          </div>
        )}
        <main id="main-content" className="main-content">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{current?.label || 'Sessions'}</strong>
            <div className="demo-indicator">
              <span className="live-dot" />
              Evidence-backed tests
            </div>
          </div>
          {['/security', '/analytics', '/integrations', '/settings'].some((path) =>
            pathname.startsWith(path),
          ) && (
            <div className="info-panel">
              <span>
                This section contains demo workspace settings and sample data. Actual shopper
                results are in Overview, Sessions, Replays, and Findings.
              </span>
            </div>
          )}
          {children}
          <footer className="page-footer">
            <span>
              <GatewayLogo small />
              Built for a more agent-ready commerce.
            </span>
            <span>
              <span className="live-dot" />
              Read-only shopper testing<span className="footer-separator">·</span>
              <button onClick={() => setHelp(true)}>
                Help & documentation
                <ExternalLink size={11} />
              </button>
            </span>
          </footer>
        </main>
      </div>
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="Getting started with Gateway"
        description="Test, observe, and secure autonomous commerce."
      >
        <div className="help-content">
          <p>
            <strong>1. Connect your storefront</strong>
            <br />
            Choose a server-configured test environment on Discover.
          </p>
          <p>
            <strong>2. Run a readiness scan</strong>
            <br />
            Inspect the storefront, review the proposed shopper archetypes and scenarios, then
            approve the plan.
          </p>
          <p>
            <strong>3. Inspect shopping sessions</strong>
            <br />
            Open a replay to inspect requests, product decisions, and policy enforcement.
          </p>
          <p>
            <strong>4. Fix and verify</strong>
            <br />
            Use Findings to inspect the evidence, make changes to your storefront, and rerun the
            reviewed plan.
          </p>
          <div className="info-panel">
            <Terminal size={17} />
            <span>
              Shopper runs visit the configured storefront and stop at recommendation or decline.
              Fixture model runs are explicitly labeled.
            </span>
          </div>
        </div>
      </Dialog>
    </>
  );
}
