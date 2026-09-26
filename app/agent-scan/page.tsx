import { AgentScanConsole } from '@/components/agent/agent-scan-console';
import { PageHeading } from '@/components/ui/page-heading';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Live Agent Scan' };

export default function AgentScanPage() {
  return (
    <>
      <PageHeading
        eyebrow="AI DIFFERENTIATION"
        title="Live Agent Scan"
        subtitle="Send real shopping goals to an autonomous agent. It reasons, takes actions against the storefront, observes the results, and reports exactly why it could not complete a purchase."
      />
      <AgentScanConsole />
    </>
  );
}