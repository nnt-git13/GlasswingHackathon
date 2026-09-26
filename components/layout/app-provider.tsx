'use client';
import { latestScan } from '@/lib/mock-data/scans';
import { securityPolicies } from '@/lib/mock-data/security';
import { getSecurityPoliciesReport } from '@/lib/security-policies';
import type { ScannedSite } from '@/lib/agent/types';
import type { Environment, SecurityPolicy } from '@/lib/types';
import { CheckCircle2, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
interface AppState {
  environment: Environment;
  setEnvironment: (v: Environment) => void;
  scanning: boolean;
  scanProgress: number;
  runScan: () => void;
  lastScanned: string;
  scanNumber: number;
  notify: (message: string) => void;
  policies: SecurityPolicy[];
  savePolicy: (policy: SecurityPolicy) => void;
  resolved: string[];
  resolve: (id: string) => void;
  verified: string[];
  verify: (id: string) => void;
  scanSite: ScannedSite | null;
  setScanSite: (site: ScannedSite | null) => void;
}
const AppContext = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironment] = useState<Environment>('Production');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanned, setLastScanned] = useState(latestScan.date);
  const [scanNumber, setScanNumber] = useState(25);
  const [toast, setToast] = useState('');
  const [policies, setPolicies] = useState(securityPolicies);
  const [resolved, setResolved] = useState<string[]>([]);
  const [verified, setVerified] = useState<string[]>([]);
  const [scanSite, setScanSite] = useState<ScannedSite | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanLock = useRef(false);
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  useEffect(() => {
    let cancelled = false;
    getSecurityPoliciesReport().then((result) => {
      if (!cancelled) setPolicies(result.policies);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const runScan = () => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanning(true);
    setScanProgress(0);
    let progress = 0;
    timer.current = setInterval(() => {
      progress += 20;
      setScanProgress(progress);
      if (progress >= 100) {
        if (timer.current) clearInterval(timer.current);
        scanLock.current = false;
        setScanning(false);
        setScanNumber((n) => n + 1);
        setLastScanned('Just now');
        notify(`Readiness scan complete · ${environment} · 86 pages analyzed · score 74/100`);
      }
    }, 650);
  };
  return (
    <AppContext.Provider
      value={{
        environment,
        setEnvironment,
        scanning,
        scanProgress,
        runScan,
        lastScanned,
        scanNumber,
        notify,
        policies,
        savePolicy: (p) =>
          setPolicies((current) =>
            current.some((item) => item.id === p.id)
              ? current.map((item) => (item.id === p.id ? p : item))
              : [...current, p],
          ),
        resolved,
        resolve: (id) => setResolved((ids) => (ids.includes(id) ? ids : [...ids, id])),
        verified,
        verify: (id) => setVerified((ids) => (ids.includes(id) ? ids : [...ids, id])),
        scanSite,
        setScanSite,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          <button onClick={() => setToast('')} aria-label="Dismiss notification">
            <X size={15} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp requires AppProvider');
  return value;
}
