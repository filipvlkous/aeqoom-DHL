import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useTcpStore from '../../useTcpStore';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

function parseQR(raw: string): { id: number; hashedId: string } | null {
  const trimmed = raw.trim();

  // Format: plain numeric ID
  if (/^\d+$/.test(trimmed)) {
    const id = parseInt(trimmed, 10);
    return { id, hashedId: '' };
  }

  // Format: AL:type:data:SYS
  if (!trimmed.startsWith('AL:') || !trimmed.endsWith(':SYS')) {
    return null;
  }

  const inner = trimmed.slice(3, -4); // strip "AL:" and ":SYS"
  const colonIdx = inner.indexOf(':');
  if (colonIdx === -1) return null;

  const type = inner.slice(0, colonIdx);
  const data = inner.slice(colonIdx + 1);

  if (type !== '12') return null;

  // data format: id-token (split on first '-')
  const dashIdx = data.indexOf('-');
  if (dashIdx === -1) return null;

  const idStr = data.slice(0, dashIdx);
  const hashedId = data.slice(dashIdx + 1);

  const id = parseInt(idStr, 10);
  if (isNaN(id) || !hashedId) return null;

  return { id, hashedId };
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const store = useTcpStore();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseQR(input);
    if (!parsed) {
      setError(t('login.errorInvalidQr'));
      return;
    }

    setLoading(true);
    try {
      const { token } = await window.authAPI.login({
        id: parsed.id,
        hashedId: parsed.hashedId,
      });

      onLoginSuccess(token);
    } catch (err: any) {
      const raw: string = err.message || t('login.errorDefault');
      const cleaned = raw.replace(
        /^Error invoking remote method '[^']+': (Error: )?/,
        '',
      );
      setError(cleaned);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t('login.title')}</h1>
        <p style={styles.subtitle}>{t('login.subtitle')}</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('login.placeholder')}
            style={styles.input}
            disabled={loading}
            autoFocus
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? t('login.loading') : t('login.submit')}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '48px',
    minWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  title: {
    color: '#e2e8f0',
    fontSize: '28px',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: '0 0 32px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    outline: 'none',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  error: {
    color: '#f87171',
    fontSize: '14px',
    marginTop: '16px',
  },
};
