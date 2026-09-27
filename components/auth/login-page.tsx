'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authenticate, startGoogleSignIn } from '@/app/auth/actions';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  LockKeyhole,
  MoreHorizontal,
  Mountain,
  RotateCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  Target,
} from 'lucide-react';
import { Dialog } from '@/components/ui/primitives';
import styles from './login.module.css';

const notices = {
  sso: [
    'Single sign-on',
    'Your organization’s identity provider is not connected. Please sign in with your email and password.',
  ],
  reset: [
    'Reset your password',
    'Self-service password recovery is not enabled yet. Contact your workspace administrator for help.',
  ],
} as const;

function GoogleMark() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3v2.6h3.3c1.9-1.8 3-4.3 3-7.5Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-0.9 6.8-2.4l-3.3-2.6c-.9.6-2.1 1-3.5 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.4H3a10 10 0 0 0 0 9.2l3.4-2.7Z" />
      <path
        fill="#EA4335"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7A6 6 0 0 1 12 6Z"
      />
    </svg>
  );
}

function SessionPreview() {
  return (
    <section className={styles.showcase} aria-label="Example of Gateway shopping session insights">
      <div className={styles.scene}>
        <div className={styles.annotation}>
          See exactly what
          <br />
          the AI shopper saw
          <svg viewBox="0 0 70 55">
            <path d="M65 5C30 5 14 23 14 46m-6-9 6 10 7-9" />
          </svg>
        </div>
        <div className={styles.annotationRight}>
          Get clear results
          <br />
          and faster fixes
          <svg viewBox="0 0 70 80">
            <path d="M50 4c10 35-6 51-32 65m2-10-3 11 12-1" />
          </svg>
        </div>
        <div className={styles.session}>
          <div className={styles.sessionHeader}>
            <strong>Shopping session&nbsp; SES-10482</strong>
            <span className={styles.badge}>
              <Check size={12} />
              Completed
            </span>
            <span className={styles.date}>Apr 22, 2025&nbsp; 10:14 AM</span>
            <MoreHorizontal size={19} />
          </div>
          <div className={styles.goal}>
            <span className={styles.target}>
              <Target size={27} />
            </span>
            <div>
              <small>Goal</small>
              <strong>Find a 45L backpack under $250</strong>
            </div>
            <div className={styles.goalStore}>
              <small>Store</small>
              <span>Alpine Supply Co.</span>
            </div>
            <div className={styles.goalAgent}>
              <small>AI shopper</small>
              <span>GPT-4o Shopper v1.2</span>
            </div>
          </div>
          <div className={styles.browser}>
            <div className={styles.browserBar}>
              <ArrowLeft size={16} />
              <ArrowRight size={16} className={styles.faded} />
              <RotateCw size={15} />
              <span>
                <LockKeyhole size={12} />
                https://alpinesupply.co
              </span>
              <MoreHorizontal size={16} />
            </div>
            <div className={styles.store}>
              <div className={styles.storeBrand}>
                <Mountain size={29} fill="currentColor" />
                <strong>ALPINE SUPPLY CO.</strong>
                <Search size={17} />
                <ShoppingCart size={17} />
              </div>
              <div className={styles.storeNav}>
                <span>Packs</span>
                <span>Camping</span>
                <span>Apparel</span>
                <span>Accessories</span>
                <span>Sale</span>
              </div>
              <div className={styles.search}>
                <Search size={15} />
                backpack 45L
              </div>
              <div className={styles.storeResults}>
                <span>24 results for “backpack 45L”</span>
                <span>
                  Sort: Best match <ChevronDown size={12} />
                </span>
              </div>
              <div className={styles.products}>
                {[
                  ['Trailhead 45L', '229', '128'],
                  ['Ridge 45L', '249', '312'],
                  ['Summit 50L', '279', '74'],
                ].map(([name, price, reviews], index) => (
                  <div
                    key={name}
                    className={`${styles.product} ${index === 1 ? styles.selected : ''}`}
                  >
                    <div className={`${styles.productPhoto} ${styles[`photo${index}`]}`}>
                      <img src="/backpack.jpg" alt={`${name} hiking backpack`} />
                    </div>
                    <div className={styles.productInfo}>
                      <strong>{name}</strong>
                      <div className={styles.stars}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} size={10} fill="currentColor" />
                        ))}
                        <span>({reviews})</span>
                      </div>
                      <b>${price}</b>
                      <span className={styles.cart}>Add to cart</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.results}>
          <div className={styles.resultsHeading}>
            <h2>Session results</h2>
            <span className={styles.badge}>
              <Check size={12} />
              Passed on rerun
            </span>
          </div>
          <ol className={styles.timeline}>
            {[
              [
                'Catalog searched',
                '00:12',
                'Searched for “backpack 45L”, applied price filter under $250. 24 results returned.',
              ],
              [
                'Variant mismatch detected',
                '00:48',
                'Selected 45L variant, but 30L was added to cart due to a variant mapping error.',
              ],
              [
                'Fix verified on rerun',
                '02:21',
                'After fix, correct 45L variant added to cart and checkout completed successfully.',
              ],
            ].map(([title, time, description], index) => (
              <li key={title}>
                <span className={`${styles.timelineIcon} ${index === 1 ? styles.warning : ''}`}>
                  {index === 1 ? '!' : <Check size={14} />}
                </span>
                <div>
                  <div className={styles.eventTitle}>
                    <strong>{title}</strong>
                    <time>{time}</time>
                  </div>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className={styles.score}>
            <h3>Task success score</h3>
            <div className={styles.scoreGrid}>
              <div>
                <span>Before fix</span>
                <strong>
                  68<small>/ 100</small>
                </strong>
              </div>
              <ArrowRight size={21} />
              <div>
                <span>After fix</span>
                <strong>
                  91<small>/ 100</small>
                </strong>
              </div>
            </div>
          </div>
          <Link className={styles.replayLink} href="/replays/SES-10482">
            <FileText size={21} />
            <span>
              View full session replay, logs and network traces
              <br />
              in the Gateway workspace.
            </span>
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function LoginPage({
  mode = 'signin',
  authError = '',
  nextPath = '/discover',
}: {
  mode?: 'signin' | 'signup';
  authError?: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState(
    authError === 'confirmation'
      ? 'This confirmation link is invalid or expired. Try signing in or request a new confirmation email.'
      : authError === 'oauth'
        ? 'Google sign-in was not completed. Try again or use your email and password.'
        : '',
  );
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState<keyof typeof notices | null>(null);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await authenticate(mode, form, nextPath);
      if (result.error) setError(result.error);
      if (result.message) setMessage(result.message);
      if (result.success) {
        router.replace(nextPath);
        router.refresh();
      }
    } catch {
      setError('Unable to reach account services. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function googleSignIn() {
    setGoogleBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await startGoogleSignIn(nextPath);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) window.location.assign(result.url);
    } catch {
      setError('Unable to start Google sign-in. Please try again.');
    } finally {
      setGoogleBusy(false);
    }
  }
  const nextQuery = nextPath === '/discover' ? '' : `?next=${encodeURIComponent(nextPath)}`;
  return (
    <main className={styles.page}>
      <section className={styles.login} aria-labelledby="login-title">
        <div className={styles.loginInner}>
          <Link href="/" className={styles.brand} aria-label="Gateway home">
            <span className={styles.logo} aria-hidden="true">
              <i />
              <i />
            </span>
            <span>
              <strong>Gateway</strong>
              <small>Merchant intelligence</small>
            </span>
          </Link>
          <div className={styles.intro}>
            <h1 id="login-title">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
            <p>
              {mode === 'signup'
                ? 'Get started with Gateway merchant intelligence.'
                : 'Sign in to monitor how autonomous shoppers experience your store.'}
            </p>
          </div>
          <form className={styles.form} onSubmit={signIn}>
            {mode === 'signup' && (
              <>
                <label htmlFor="full-name">Full name</label>
                <input
                  id="full-name"
                  name="full_name"
                  autoComplete="name"
                  placeholder="Your name"
                  required
                  maxLength={100}
                />
              </>
            )}
            <label htmlFor="work-email">Work email</label>
            <input
              id="work-email"
              type="email"
              name="email"
              autoComplete="username"
              placeholder="you@company.com"
              required
            />
            <label htmlFor="password">Password</label>
            <div className={styles.password}>
              <input
                id="password"
                type={visible ? 'text' : 'password'}
                name="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 8 : undefined}
                maxLength={128}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
              >
                {visible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {mode === 'signin' && (
              <button className={styles.forgot} type="button" onClick={() => setNotice('reset')}>
                Forgot password?
              </button>
            )}
            {mode === 'signup' && (
              <p className={styles.demo}>Use at least 8 characters for your password.</p>
            )}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className={styles.success} role="status">
                {message}
              </p>
            )}
            <button className={styles.submit} type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={19} className={styles.spinner} />
                  Please wait…
                </>
              ) : mode === 'signup' ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>
          <div className={styles.divider}>
            <span />
            or
            <span />
          </div>
          <div className={styles.providers}>
            <button type="button" onClick={googleSignIn} disabled={googleBusy || busy}>
              {googleBusy ? <Loader2 size={19} className={styles.spinner} /> : <GoogleMark />}
              {googleBusy ? 'Connecting to Google…' : 'Continue with Google'}
            </button>
            <button onClick={() => setNotice('sso')}>
              <Building2 size={23} />
              Continue with SSO
            </button>
          </div>
          <p className={styles.request}>
            {mode === 'signup' ? 'Already have an account? ' : 'New to Gateway? '}
            <Link href={`${mode === 'signup' ? '/login' : '/signup'}${nextQuery}`}>
              {mode === 'signup' ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          <p className={styles.security}>
            <ShieldCheck size={21} />
            Secure sign-in · Your data stays private
          </p>
        </div>
      </section>
      <SessionPreview />
      <Dialog
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById('work-email')?.focus();
        }}
        open={notice !== null}
        onOpenChange={(open) => !open && setNotice(null)}
        title={notice ? notices[notice][0] : ''}
        description={notice ? notices[notice][1] : ''}
      >
        <button
          className={styles.submit}
          onClick={() => {
            setNotice(null);
            document.getElementById('work-email')?.focus();
          }}
        >
          Back to sign in
        </button>
      </Dialog>
    </main>
  );
}
