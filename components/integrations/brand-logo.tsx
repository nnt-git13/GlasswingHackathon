import { Webhook } from 'lucide-react';
import { brandPaths } from './brand-paths';
import { commercetoolsLogo } from './commercetools-logo';
import type { Integration } from '@/lib/integrations/catalog';
import styles from './integrations.module.css';
export function BrandLogo({
  integration,
  small = false,
}: {
  integration: Integration;
  small?: boolean;
}) {
  const paths = brandPaths[integration.id as keyof typeof brandPaths];
  return (
    <span
      className={`${styles.logo} ${small ? styles.smallLogo : ''}`}
      style={{ color: integration.color }}
    >
      {integration.id === 'commercetools' ? (
        <img src={commercetoolsLogo} width="32" height="32" alt="commercetools logo" />
      ) : paths ? (
        <svg
          viewBox="0 0 24 24"
          role="img"
          aria-label={`${integration.name} logo`}
          fill="currentColor"
        >
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
      ) : (
        <Webhook aria-label="Webhook" />
      )}
    </span>
  );
}
