import { useState, useEffect } from 'react';
import { Bot, Key, Save, RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../services/api';
import styles from './AIConfig.module.css';

const DEFAULT = {
  modelName: 'gemini-1.5-flash-latest',
  secretKeys: [],
  systemPrompt: 'You are a helpful assistant that generates product titles, descriptions, and SKUs based on Book Category, Main Degree, Sub Degree, and Subject. Return only a JSON object with \'title\', \'description\', and \'sku\' keys.',
  isActive: false,
};

const MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

export default function AIConfig() {
  const [config, setConfig] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/ai/config');
      const data = res.data?.data || res.data || DEFAULT;
      setConfig({
        modelName: data.modelName || DEFAULT.modelName,
        secretKeys: Array.isArray(data.secretKeys) ? data.secretKeys : [],
        systemPrompt: data.systemPrompt || DEFAULT.systemPrompt,
        isActive: !!data.isActive,
      });
    } catch { toast.error('Failed to load AI config'); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (config.secretKeys.length === 0) {
      toast.error('Add at least one API key before saving');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/ai/config', config);
      toast.success('AI configuration saved');
    } catch { toast.error('Failed to save config'); }
    finally { setSaving(false); }
  };

  const addKey = () => {
    const k = newKey.trim();
    if (!k) return;
    if (config.secretKeys.includes(k)) { toast.warning('Key already added'); return; }
    setConfig(c => ({ ...c, secretKeys: [...c.secretKeys, k] }));
    setNewKey('');
  };

  const removeKey = (i) => {
    setConfig(c => ({ ...c, secretKeys: c.secretKeys.filter((_, idx) => idx !== i) }));
  };

  const testAI = async () => {
    if (!config.isActive || config.secretKeys.length === 0) {
      toast.warning('Enable AI and add an API key first');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/api/ai/generate', {
        category: 'Test Category',
        mainDegree: 'B.Com',
        subDegree: 'Finance',
        subject: 'Accounting',
      });
      setTestResult({ success: true, data: res.data });
      toast.success('AI test successful');
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.message || err.message });
      toast.error('AI test failed');
    } finally { setTesting(false); }
  };

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /><span>Loading AI config...</span></div>;

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="page-header">
        <div>
          <h1 className="page-title">AI Configuration</h1>
          <p className="page-sub">Configure Google Gemini AI for product content generation</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchConfig}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />} Save
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left — Config */}
        <div className={styles.left}>

          {/* Status toggle */}
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>AI Generation</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Enable to auto-generate product titles, descriptions, and SKUs
                </div>
              </div>
              <button onClick={() => set('isActive', !config.isActive)} className={styles.toggleBtn}>
                {config.isActive
                  ? <ToggleRight size={32} color="var(--color-success)" />
                  : <ToggleLeft size={32} color="var(--text-muted)" />}
              </button>
            </div>
            <div className={styles.statusBadge} style={{ marginTop: 12 }}>
              <span className={`badge ${config.isActive ? 'badge-success' : 'badge-neutral'}`}>
                {config.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Model */}
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Bot size={14} /> Gemini Model
            </label>
            <select className="form-select" value={config.modelName} onChange={e => set('modelName', e.target.value)}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* API Keys */}
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <Key size={14} /> API Keys
              </label>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowKeys(v => !v)}>
                {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="form-input"
                type={showKeys ? 'text' : 'password'}
                placeholder="Paste Gemini API key..."
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKey()}
                style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
              />
              <button className="btn btn-primary btn-sm" onClick={addKey} disabled={!newKey.trim()}>
                <Plus size={13} /> Add
              </button>
            </div>

            {config.secretKeys.length === 0 ? (
              <div style={{ padding: '12px', background: 'var(--bg-box)', borderRadius: 'var(--r-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No API keys added. Add at least one key to enable AI generation.
              </div>
            ) : (
              <div className={styles.keyList}>
                {config.secretKeys.map((k, i) => (
                  <div key={i} className={styles.keyRow}>
                    <Key size={12} color="var(--text-muted)" />
                    <span className={styles.keyVal}>
                      {showKeys ? k : `${k.slice(0, 6)}${'•'.repeat(Math.min(k.length - 10, 20))}${k.slice(-4)}`}
                    </span>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeKey(i)}>
                      <Trash2 size={13} color="var(--color-danger)" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Multiple keys are rotated automatically to handle rate limits.
            </div>
          </div>

          {/* System Prompt */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>System Prompt</label>
            <textarea
              className="form-input"
              rows={6}
              value={config.systemPrompt}
              onChange={e => set('systemPrompt', e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Instructs Gemini how to format its response. Must return JSON with <code>title</code>, <code>description</code>, and <code>sku</code>.
            </div>
          </div>
        </div>

        {/* Right — Test */}
        <div className={styles.right}>
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Test AI Generation</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Sends a test product prompt using your current config and shows the raw response.
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={testAI}
              disabled={testing || !config.isActive || config.secretKeys.length === 0}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {testing ? <><Loader2 size={13} className="spin" /> Testing...</> : <><Bot size={13} /> Run Test</>}
            </button>

            {testResult && (
              <div className={`${styles.testResult} ${testResult.success ? styles.testOk : styles.testFail}`}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {testResult.success ? '✓ Success' : '✗ Failed'}
                </div>
                <pre className={styles.pre}>
                  {testResult.success
                    ? JSON.stringify(testResult.data, null, 2)
                    : testResult.error}
                </pre>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '20px 24px', marginTop: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>How It Works</div>
            <ol className={styles.howList}>
              <li>Add your Google Gemini API key(s) from <strong>aistudio.google.com</strong></li>
              <li>Select a model — Flash is faster, Pro is more capable</li>
              <li>Enable AI generation with the toggle</li>
              <li>Save the config</li>
              <li>On the Products page, click <strong>"Generate with AI"</strong> when adding a product</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
