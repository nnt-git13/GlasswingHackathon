'use client';
import { Button, Dialog, Dropdown, DropdownItem, LoadingLabel } from '@/components/ui/primitives';
import { merchant, productConfig } from '@/lib/mock-data/merchant';
import { cn } from '@/lib/utils';
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronsUpDown,
  CirclePlay,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Menu,
  Mountain,
  Plug,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  Terminal,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from '@/app/auth/actions';
import { useApp } from './app-provider';
const navigation = [
  { href: '/discover', label: 'Discover', icon: Search },
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/scan', label: 'Readiness Scan', icon: ScanLine },
  { href: '/agent-scan', label: 'Live Agent Scan', icon: Bot },
  { href: '/sessions', label: 'Sessions', icon: Activity },
  { href: '/security', label: 'Security', icon: ShieldCheck },
  { href: '/replays', label: 'Replays', icon: CirclePlay },
  { href: '/recommendations', label: 'Recommendations', icon: Wand2, badge: '12' },
  { href: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
];
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
            <strong>{productConfig.organization}</strong>
            <span>Commerce workspace</span>
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
              className={cn('nav-item', path.startsWith(item.href) && 'active')}
            >
              <item.icon size={17} strokeWidth={1.7} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </Link>
          ))}
          <div className="nav-divider" />
          {[
            { href: '/integrations', label: 'Integrations', icon: Plug },
            { href: '/settings', label: 'Settings', icon: Settings2 },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn('nav-item', path.startsWith(item.href) && 'active')}
            >
              <item.icon size={17} strokeWidth={1.7} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-health">
            <span className="live-dot" />
            All systems operational
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
  return (
    <Dropdown
      trigger={
        <button className="merchant-selector">
          <span className="merchant-avatar">
            <Mountain size={17} />
          </span>
          <strong>{merchant.name}</strong>
          <ChevronDown size={13} />
        </button>
      }
    >
      <div className="dropdown-label">YOUR STOREFRONTS</div>
      <DropdownItem selected>
        <Mountain size={15} />
        <span>
          {merchant.name}
          <small>{merchant.domain}</small>
        </span>
      </DropdownItem>
      <div className="dropdown-separator" />
      <DropdownItem onSelect={() => window.location.assign('/integrations')}>
        <Plug size={14} />
        Connect a storefront
      </DropdownItem>
    </Dropdown>
  );
}
export function EnvironmentSelector() {
  const { environment, setEnvironment } = useApp();
  return (
    <Dropdown
      trigger={
        <button className="environment-selector">
          <span className={cn('live-dot', environment === 'Staging' && 'amber')} />
          {environment}
          <ChevronDown size={12} />
        </button>
      }
    >
      <div className="dropdown-label">ENVIRONMENT</div>
      {(['Production', 'Staging'] as const).map((env) => (
        <DropdownItem key={env} selected={env === environment} onSelect={() => setEnvironment(env)}>
          <span className={cn('live-dot', env === 'Staging' && 'amber')} />
          {env}
        </DropdownItem>
      ))}
    </Dropdown>
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
        {merchant.domain}
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
        <div className="notification-item">
          <span className="icon-box green">
            <Check size={18} />
          </span>
          <div>
            <strong>Readiness scan completed</strong>
            <p>Scan #25 analyzed 86 pages. Readiness improved to 74.</p>
            <small>Today at 11:42 AM</small>
          </div>
        </div>
        <div className="notification-item">
          <span className="icon-box amber">
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>Unsafe promotion attempt blocked</strong>
            <p>Merchant policy protected session SES-10479.</p>
            <Link href="/replays/SES-10479" onClick={() => setNotifications(false)}>
              Inspect session →
            </Link>
          </div>
        </div>
      </Dialog>
    </header>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const { scanning, scanProgress } = useApp();
  const pathname = usePathname();
  const current = [
    ...navigation,
    { href: '/integrations', label: 'Integrations' },
    { href: '/settings', label: 'Settings' },
  ].find((x) => pathname.startsWith(x.href));
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/discover' ||
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
              Demo workspace
            </div>
          </div>
          {children}
          <footer className="page-footer">
            <span>
              <GatewayLogo small />
              Built for a more agent-ready commerce.
            </span>
            <span>
              <span className="live-dot" />
              All systems operational<span className="footer-separator">·</span>
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
            Configure Shopify or a commerce API under Integrations.
          </p>
          <p>
            <strong>2. Run a readiness scan</strong>
            <br />
            Gateway discovers products, generates shopping goals, and evaluates merchant policies.
          </p>
          <p>
            <strong>3. Inspect shopping sessions</strong>
            <br />
            Open a replay to inspect requests, product decisions, and policy enforcement.
          </p>
          <p>
            <strong>4. Fix and verify</strong>
            <br />
            Use Recommendations to review implementation details and run a verification.
          </p>
          <div className="info-panel">
            <Terminal size={17} />
            <span>
              This workspace uses simulated data. Scan and verification runs do not contact the
              merchant or place live orders.
            </span>
          </div>
        </div>
      </Dialog>
    </>
  );
}
