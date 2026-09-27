'use client';
import { PageHeading } from '@/components/ui/page-heading';
import { Card, CardHeader, Tabs } from '@/components/ui/primitives';
import { Check, ShoppingBag, Store, X } from 'lucide-react';
import { useState } from 'react';

interface Point {
  label?: string;
  text: string;
}
interface Section {
  number: string;
  category: string;
  answer: string;
  points: Point[];
}

const sections: Section[] = [
  {
    number: '01',
    category: 'Customer Problem',
    answer:
      'Autonomous shopping agents are already generating real transactions, and most commerce stacks were never tested against them.',
    points: [
      {
        label: 'Genuine or emerging?',
        text: 'Both — AI-referred traffic to US retail sites grew 393% YoY in Q1 2026, and that traffic now converts 42% better than organic, a full reversal from a year earlier.',
      },
      {
        label: 'Who feels it, and why?',
        text: "E-commerce and platform engineering teams at mid-market/enterprise merchants on headless or custom stacks — the ones Shopify's built-in agent tooling doesn't fully cover. They ship weekly with no signal when a release breaks agent purchasing.",
      },
      {
        label: 'Already a workflow companies pay for?',
        text: 'Yes, done manually — one agency ran a shopping agent against 10 real stores and only 3 completed a purchase end-to-end; the same piece recommends merchants manually test their top 20 products every month. That manual audit is what we automate.',
      },
      {
        label: 'Why now?',
        text: "40% of e-commerce businesses are still standardizing product pages for agents, and 33% haven't started at all.",
      },
    ],
  },
  {
    number: '02',
    category: 'Business Case',
    answer:
      'We replace a manual, occasional check with a continuous, automated one — before it costs a sale.',
    points: [
      {
        label: 'Replaces:',
        text: 'the manual "ask an agent to buy your top products and see what breaks" audit, plus fragmented spend across QA, bot-security tooling, and one-off consulting audits.',
      },
      {
        label: 'Measurable outcome:',
        text: 'agent-completed purchase rate protected release-over-release, checkout-failure rate reduced, engineering hours saved by auto-diagnosing root cause instead of manually reproducing a failed session.',
      },
      {
        label: 'Improves workflow:',
        text: 'turns an occasional manual spot-check into a regression gate in CI/CD.',
      },
      {
        label: 'Willingness to pay:',
        text: 'sits in the same budget line as existing QA and bot-security tooling.',
      },
    ],
  },
  {
    number: '03',
    category: 'Operational Fit',
    answer:
      'Runs in CI against staging — nothing touches production, and every proposed fix is a diff a human approves.',
    points: [
      {
        label: 'Users:',
        text: 'engineering and QA teams shipping the storefront. Buyer: digital commerce or engineering leadership.',
      },
      {
        label: 'Fits existing systems:',
        text: 'tests run against a staging URL inside GitHub Actions; never touches production, never places a real order.',
      },
      {
        label: 'Adoption barriers, honestly:',
        text: "our test agent isn't literally ChatGPT's or Perplexity's agent, so we run two independent models and report where they disagree rather than claiming one speaks for all; every AI-generated fix requires human approval, never auto-merged.",
      },
      {
        label: 'Beyond the prototype:',
        text: 'point at a staging URL or connect a lightweight SDK; native Shopify/commercetools/BigCommerce connectors are roadmap.',
      },
    ],
  },
  {
    number: '04',
    category: 'AI Differentiation',
    answer:
      'A checklist tells you a field is missing. Only an agent can tell you whether a real shopper could actually finish the purchase.',
    points: [
      {
        label: 'Core task:',
        text: "open-ended goal interpretation, multi-step autonomous navigation, and judgment about whether an action matches the shopper's intent — not a fixed rule set. (See the toggle above.)",
      },
      {
        text: 'Off-the-shelf frontier models (DeepSeek V4.1 Flash, GLM 5.3 Flash) — the IP is the harness: goal generation, grading against real ground truth, root-cause taxonomy, fix generation.',
      },
      {
        label: 'Evolves with better models:',
        text: 'model id is a config value, not hardcoded; we run two providers side by side and report the score delta between them live.',
      },
      {
        label: 'Data moat:',
        text: 'every run produces a trace of which site patterns break which agents — a benchmark set that accrues over time and is expensive to replicate without also running many real sites against many real agents.',
      },
    ],
  },
];

const checklist = ['Product schema', 'Meta description', 'robots.txt', 'Returns policy'];

const audiences = [
  {
    tier: 'Start here',
    who: 'Mid-market and enterprise merchants running headless or custom storefronts',
    detail:
      'Shopify Plus with a custom frontend, commercetools, Salesforce Commerce Cloud, bespoke React stacks. They ship weekly, they fall outside what platform-native agent tooling covers, and they already fund QA and bot-security budgets.',
  },
  {
    tier: 'Expand',
    who: 'The broader mid-market on standard platform storefronts',
    detail:
      'The same failure modes with less urgency today. This tier buys once agent-referred traffic is large enough to show up in their own funnel reporting.',
  },
  {
    tier: 'Channel',
    who: 'Commerce platforms — Shopify, Wix, Squarespace, BigCommerce, commercetools',
    detail:
      'Embedded rather than sold direct. One integration reaches thousands of merchants, and a checkout an agent cannot complete is a platform problem as much as a merchant one.',
  },
];

function PointList({ points }: { points: Point[] }) {
  return (
    <ul className="pitch-points">
      {points.map((point) => (
        <li key={point.text}>
          {point.label && <span className="pitch-point-label">{point.label}</span>}
          <p>{point.text}</p>
        </li>
      ))}
    </ul>
  );
}

function StorefrontMock({ live }: { live: boolean }) {
  return (
    <div className="pitch-mock">
      <div className="pitch-mock-bar">
        <span className="pitch-mock-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="pitch-mock-url">evertrailoutdoors.com/products/summit-trail-45l</span>
        {live && (
          <span className="pitch-mock-live">
            <span className="live-dot" />
            Agent session
          </span>
        )}
      </div>
      <div className="pitch-mock-body">
        <span className="pitch-mock-photo" />
        <div className="pitch-mock-details">
          <strong>Summit Trail 45L Backpack</strong>
          <span>$199.00</span>
          <button type="button" className="pitch-mock-cart" tabIndex={-1} aria-hidden="true">
            <ShoppingBag size={12} />
            Add to cart
          </button>
        </div>
        {live && (
          <div className="pitch-mock-overlay">
            <span className="pitch-mock-overlay-close">
              <X size={11} />
            </span>
            <strong>Get 10% off your first order</strong>
            <span>Join the Evertrail newsletter</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PitchPage() {
  const [mode, setMode] = useState('Static checklist');
  const live = mode === 'Live agent';
  return (
    <>
      <PageHeading
        title="Why This Matters"
        subtitle="Who has this problem, what it costs them, how this deploys, and why it takes an agent."
      />
      <div className="pitch-banner pitch-enter">
        <p>Checklists grade your data. We test whether agents can buy.</p>
      </div>
      {sections.map((section, index) => (
        <Card
          key={section.number}
          className="pitch-section pitch-enter"
          style={{ animationDelay: `${(index + 1) * 120}ms` }}
        >
          <CardHeader
            title={section.answer}
            icon={<span className="pitch-number">{section.number}</span>}
            action={<span className="subtle-badge">{section.category}</span>}
          />
          <div className="pitch-body">
            {section.number === '04' && (
              <div className="pitch-demo">
                <Tabs
                  tabs={['Static checklist', 'Live agent']}
                  active={mode}
                  onChange={setMode}
                />
                <div className="pitch-demo-stage" key={mode}>
                  <StorefrontMock live={live} />
                  {live ? (
                    <p className="pitch-agent-result">
                      Agent result: Blocked at checkout — could not dismiss overlay.
                    </p>
                  ) : (
                    <div className="pitch-checklist">
                      {checklist.map((item) => (
                        <span key={item}>
                          <Check size={12} />
                          {item}
                        </span>
                      ))}
                      <strong>Readiness score: 100</strong>
                    </div>
                  )}
                </div>
                <small className="pitch-demo-note">
                  Illustrative example — see Sessions and Replays for real agent runs.
                </small>
              </div>
            )}
            <PointList points={section.points} />
          </div>
        </Card>
      ))}
      <Card
        className="pitch-section pitch-enter"
        style={{ animationDelay: `${(sections.length + 1) * 120}ms` }}
      >
        <CardHeader
          title="We start with the merchants platform-native tooling leaves uncovered, then widen."
          icon={
            <span className="pitch-number">
              <Store size={13} />
            </span>
          }
          action={<span className="subtle-badge">Who we sell to</span>}
        />
        <div className="pitch-body">
          <div className="pitch-audiences">
            {audiences.map((audience) => (
              <div className="pitch-audience" key={audience.tier}>
                <span className="pitch-audience-tier">{audience.tier}</span>
                <div>
                  <strong>{audience.who}</strong>
                  <p>{audience.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <small className="pitch-demo-note">
            Not the SMB long tail — platform-native tooling reaches it first, and those storefronts
            break in far more predictable ways.
          </small>
        </div>
      </Card>
    </>
  );
}
