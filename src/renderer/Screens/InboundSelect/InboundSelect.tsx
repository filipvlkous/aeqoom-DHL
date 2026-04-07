import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface InboundSelectProps {
  token: string;
  onInboundSelected: (inboundId: number) => void;
}

// function parseQR(qr: string): { type: number; data: string } | null {
//   const parts = qr.trim().split(':');
//   if (parts.length !== 4) return null;
//   if (parts[0] !== 'AL' || parts[3] !== 'SYS') return null;
//   return { type: Number(parts[1]), data: parts[2] };
// }

function parseQR(raw: string): { data: number; hashedId: string } | null {
  const trimmed = raw.trim();

  // Format: plain numeric ID
  if (/^\d+$/.test(trimmed)) {
    const data = parseInt(trimmed, 10);
    return { data, hashedId: '' };
  }

  // Format: AL:type:data:SYS
  if (!trimmed.startsWith('AL:') || !trimmed.endsWith(':SYS')) {
    return null;
  }

  const inner = trimmed.slice(3, -4); // strip "AL:" and ":SYS"
  const colonIdx = inner.indexOf(':');
  if (colonIdx === -1) return null;

  const type = inner.slice(0, colonIdx);
  const dataCode = inner.slice(colonIdx + 1);

  if (type !== '31') return null;

  // Strip leading "31" prefix from data if present (only the first occurrence)
  const cleanedCode = dataCode.startsWith('31') ? dataCode.slice(2) : dataCode;

  const data = parseInt(cleanedCode, 10);

  if (isNaN(data)) return null;

  return { data, hashedId: '' };
}

export default function InboundSelect({
  token,
  onInboundSelected,
}: InboundSelectProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submitInboundId = async (id: number) => {
    setError(null);
    setLoading(true);
    try {
      await window.inboundAPI.startInbound(id, token);
     
      onInboundSelected(id);
    } catch (err: any) {
      const raw: string = err.message || t('inboundSelect.errorDefault');
      const cleaned = raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
      setError(cleaned);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    const id = Number(trimmed);
    if (!id || isNaN(id)) {
      setError(t('inboundSelect.errorInvalidId'));
      return;
    }
    await submitInboundId(id);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const parsed = parseQR(val);

      const cleanedCode = parsed?.data.toString().startsWith('31')
        ? parsed.data.toString().slice(2)
        : parsed?.data;

      if (cleanedCode) {
        setInput(String(cleanedCode));
      } else if (val.startsWith('AL:')) {
        // Partial QR code being scanned — keep raw until complete
        setInput(String(cleanedCode));
      } else {
        setInput(val.replace(/\D/g, ''));
      }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t('inboundSelect.title')}</h1>
        <p style={styles.subtitle}>{t('inboundSelect.subtitle')}</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            placeholder={t('inboundSelect.placeholder')}
            style={styles.input}
            disabled={loading}
            autoFocus
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? t('inboundSelect.loading') : t('inboundSelect.submit')}
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
