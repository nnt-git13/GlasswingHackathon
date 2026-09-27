'use client';
import { useApp } from '@/components/layout/app-provider';
import { PageHeading } from '@/components/ui/page-heading';
import { Button, Card, Select, Tabs } from '@/components/ui/primitives';
import { useStorefrontContext } from '@/components/gateway/provider';
import { Check, Mountain, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
export default function SettingsPage() {
  const [tab, setTab] = useState('General');
  const { hostname } = useStorefrontContext();
  const [org, setOrg] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('America/New_York');
  const [scanFrequency, setScanFrequency] = useState('Daily');
  const [email, setEmail] = useState(true);
  const { notify } = useApp();
  return (
    <>
      <PageHeading
        title="Settings"
        subtitle="Manage your workspace and readiness monitoring preferences."
      />
      <Card className="gateway-panel">
        <h2>Workspace tools</h2>
        <p className="muted">
          Manage connected services and the policies applied to shopper sessions.
        </p>
        <div className="gateway-toolbar">
          <Button asChild variant="outline">
            <Link href="/integrations">Manage integrations</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/security">
              <ShieldCheck size={14} />
              Security policies
            </Link>
          </Button>
        </div>
      </Card>
      <Card className="settings-card">
        <Tabs
          tabs={['General', 'Scan preferences', 'Notifications']}
          active={tab}
          onChange={setTab}
        />
        <form
          className="settings-form form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            notify('Workspace preferences saved for this demo session.');
          }}
        >
          {tab === 'General' ? (
            <>
              <div className="settings-section-title">
                <span className="merchant-avatar">
                  <Mountain size={22} />
                </span>
                <div>
                  <h2>Workspace details</h2>
                  <p>Your organization and connected storefront.</p>
                </div>
              </div>
              <label>
                Organization name
                <input
                  required
                  value={org ?? hostname ?? 'Your workspace'}
                  onChange={(e) => setOrg(e.target.value)}
                />
              </label>
              <label>
                Storefront domain
                <input
                  required
                  value={domain ?? hostname ?? ''}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </label>
              <label>
                Timezone
                <Select
                  label="Timezone"
                  value={timezone}
                  onChange={setTimezone}
                  options={['America/New_York', 'America/Los_Angeles', 'Europe/London', 'UTC']}
                />
              </label>
            </>
          ) : tab === 'Scan preferences' ? (
            <>
              <h2>Readiness monitoring</h2>
              <label>
                Scan frequency
                <Select
                  label="Scan frequency"
                  value={scanFrequency}
                  onChange={setScanFrequency}
                  options={['Daily', 'Weekly', 'On deployment', 'Manual only']}
                />
              </label>
              <div className="info-panel">
                <ShieldCheck size={17} />
                <span>
                  Storefront tests use recorded browser observations. Optional checkout tests stop
                  before payment.
                </span>
              </div>
            </>
          ) : (
            <>
              <h2>Notification preferences</h2>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={email}
                  onChange={(e) => setEmail(e.target.checked)}
                />
                Notify me when a scan completes or a critical policy violation is detected.
              </label>
              <p className="muted">Notification delivery is simulated in this demo workspace.</p>
            </>
          )}
          <div className="dialog-actions">
            <Button type="submit">
              <Check size={14} />
              Save preferences
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
