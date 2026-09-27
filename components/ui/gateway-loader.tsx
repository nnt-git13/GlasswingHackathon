import styles from './gateway-loader.module.css';

const stages = ['Discover', 'Evaluate', 'Act', 'Verify'];

export function GatewayLoader({ label = 'Gateway is following the shopper journey' }: { label?: string }) {
  return (
    <div className={styles.loader} role="status" aria-live="polite" aria-label={label}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.pulse} aria-hidden="true" />
          <strong>{label}</strong>
        </div>
        <div className={styles.journey} aria-hidden="true">
          <span className={styles.track} />
          <span className={styles.agent} />
          {stages.map((stage, index) => (
            <span className={styles.stage} key={stage} style={{ '--stage': index } as React.CSSProperties}>
              <i />
              <small>{stage}</small>
            </span>
          ))}
        </div>
        <p>Checking how an autonomous customer experiences this storefront…</p>
      </div>
    </div>
  );
}
