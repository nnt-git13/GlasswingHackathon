import type { Finding } from './schemas';

export interface FindingGuidance {
  /** Plain-language restatement of the finding, for a shop owner rather than an engineer. */
  headline: string;
  /** What the shopper actually experienced, in shop terms. */
  whatHappened: string;
  /** The recommended fix, phrased as something a merchant can act on. */
  fix: string;
  /** Concrete things to go and look at on the storefront. */
  commonCauses: string[];
  /** Short label shown in place of the raw category id. */
  label: string;
}

// TODO(human): write the guidance for an inconclusive run.
// An inconclusive result is not a failure — the agent simply could not gather
// enough evidence to say either way. The open question is how much to alarm
// the merchant: nudge them to investigate, or reassure them it is routine and
// only worth chasing if it repeats. You run the shop, so that call is yours.
// Until this is filled in, `guidanceFor` falls back to `neutralGuidance` below,
// so nothing is broken in the meantime.
const uncertaintyGuidance: FindingGuidance | null = null;

const neutralGuidance: FindingGuidance = {
  label: 'Needs another look',
  headline: 'This run could not be confirmed either way',
  whatHappened:
    'The agent finished, but there was not enough on the page for it to confirm whether the shopper got what they asked for.',
  fix: 'Open the recorded session and check the last page the agent saw. If the details a shopper needs are on that page but hard to read, they are probably loading too late or sitting inside an image.',
  commonCauses: [
    'Price or availability that loads a moment after the rest of the page',
    'Key product details shown only inside an image',
    'A page that looks complete to a person but is still loading underneath',
  ],
};

const guidance: Record<Exclude<Finding['category'], 'uncertainty'>, FindingGuidance> = {
  boundary: {
    label: 'Blocked path',
    headline: 'A shopper got stopped before they could finish',
    whatHappened:
      'Something interrupted the shopping path and the agent could not get back to browsing. A person clicks the X without thinking about it; an automated shopper often cannot find it, and gives up there.',
    fix: 'Make sure anything that covers the page can be closed with a clearly labelled close button that is part of the page itself — not an image, and not a bare icon with no label. Hold newsletter and discount pop-ups until after a few page views, and never trigger one on a product page or during checkout.',
    commonCauses: [
      'Newsletter or discount pop-ups appearing on product pages',
      'Cookie or region banners covering the Add to cart button',
      'Age gates or "choose your country" screens before the catalog',
      'Chat widgets that expand over the page on load',
    ],
  },
  goal: {
    label: 'Wrong result',
    headline: 'The agent finished, but not with what the shopper asked for',
    whatHappened:
      'The agent completed its run and landed on a product, but that product did not match the request — wrong price, wrong variant, or details it could not confirm from the page.',
    fix: 'Check that price, size or variant, and availability appear as readable text on the product page rather than only inside an image or a script that loads later. If choosing a variant changes the price, make sure the visible price updates with it.',
    commonCauses: [
      'Price that only updates after a variant is chosen',
      'Size or colour options that do not change the page text',
      'Sold-out variants still shown as available',
      'Product details held in an image instead of text',
    ],
  },
  execution: {
    label: 'Run error',
    headline: 'The run stopped for a technical reason',
    whatHappened:
      'The session ended because of an error or a timeout, not because of anything the shopper decided. This says more about how the page loaded than about how it is built.',
    fix: 'Re-run it first — intermittent slowness is the most common cause. If it fails on the same page every time, look at that page’s load time and any third-party scripts running on it.',
    commonCauses: [
      'A page that takes a long time to finish loading',
      'Third-party scripts (reviews, chat, analytics) blocking the page',
      'An intermittent server error on one template',
    ],
  },
};

export function guidanceFor(finding: Pick<Finding, 'category'>): FindingGuidance {
  if (finding.category === 'uncertainty') return uncertaintyGuidance || neutralGuidance;
  return guidance[finding.category];
}

const severityRank: Record<Finding['severity'], number> = { high: 0, medium: 1, info: 2 };

export interface GroupedFinding<T extends Finding> {
  category: Finding['category'];
  severity: Finding['severity'];
  guidance: FindingGuidance;
  /** Every finding of this kind, so the card can say how many sessions hit it. */
  occurrences: T[];
}

/**
 * One finding is recorded per failing session, so a storefront problem that
 * breaks three shoppers produces three findings with the same cause and the
 * same fix. Group them so the merchant sees one issue with a count rather
 * than the same recommendation repeated.
 */
export function groupFindings<T extends Finding>(findings: T[]): GroupedFinding<T>[] {
  const groups = new Map<Finding['category'], T[]>();
  for (const finding of findings) {
    const existing = groups.get(finding.category);
    if (existing) existing.push(finding);
    else groups.set(finding.category, [finding]);
  }
  return [...groups.entries()]
    .map(([category, occurrences]) => ({
      category,
      severity: occurrences
        .map((item) => item.severity)
        .sort((a, b) => severityRank[a] - severityRank[b])[0],
      guidance: guidanceFor({ category }),
      occurrences,
    }))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

export function urgencyLabel(severity: Finding['severity']) {
  if (severity === 'high') return 'Fix first';
  if (severity === 'medium') return 'Worth fixing';
  return 'For awareness';
}
