import { useState, useEffect } from 'react';
import { HardDrive, Database, Image, Video, FileText, Archive, RefreshCw, AlertCircle } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import settingsService from '../services/settingsService';
import styles from './StorageManager.module.css';

const fmt = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const pct = (part, total) => total > 0 ? Math.round((part / total) * 100) : 0;

export default function StorageManager() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await settingsService.getStorageStats();
      setStats(res?.data || res || null);
    } catch { toast.error('Failed to load storage stats'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /><span>Loading storage data...</span></div>;

  const db = stats?.database || {};
  const local = stats?.localStorage || {};
  const localTotal = local.total || 0;

  const localItems = [
    { label: 'Images',  icon: Image,    size: local.images  || 0, color: '#2563eb' },
    { label: 'Videos',  icon: Video,    size: local.videos  || 0, color: '#7c3aed' },
    { label: 'PDFs',    icon: FileText, size: local.pdf     || 0, color: '#ea580c' },
    { label: 'Backups', icon: Archive,  size: local.backups || 0, color: '#059669' },
  ];

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Storage Manager</h1>
          <p className="page-sub">Database and local file storage statistics</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchStats}><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Database card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className={styles.cardHead}>
            <div className={styles.cardIcon} style={{ background: 'rgba(37,99,235,.12)', color: '#2563eb' }}>
              <Database size={18} />
            </div>
            <div>
              <div className={styles.cardTitle}>MySQL Database</div>
              <div className={styles.cardSub}>Sequelize / MySQL</div>
            </div>
          </div>

          <div className={styles.bigNum}>{fmt(db.storageSize)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Total storage used</div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <div className={styles.metaVal}>{fmt(db.dataSize)}</div>
              <div className={styles.metaLabel}>Data size</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaVal}>{fmt(db.indexSize)}</div>
              <div className={styles.metaLabel}>Index size</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaVal}>{(db.objects || 0).toLocaleString()}</div>
              <div className={styles.metaLabel}>Total rows</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaVal}>{db.collections || 0}</div>
              <div className={styles.metaLabel}>Tables</div>
            </div>
          </div>
        </div>

        {/* Local Storage card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className={styles.cardHead}>
            <div className={styles.cardIcon} style={{ background: 'rgba(5,150,105,.12)', color: '#059669' }}>
              <HardDrive size={18} />
            </div>
            <div>
              <div className={styles.cardTitle}>Local File Storage</div>
              <div className={styles.cardSub}>Server disk / uploads</div>
            </div>
          </div>

          <div className={styles.bigNum}>{fmt(localTotal)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Total files used</div>

          <div className={styles.barList}>
            {localItems.map(item => (
              <div key={item.label} className={styles.barItem}>
                <div className={styles.barMeta}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <item.icon size={13} style={{ color: item.color }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct(item.size, localTotal)}%</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(item.size)}</span>
                  </div>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${pct(item.size, localTotal)}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className={styles.note}>
        <AlertCircle size={14} />
        <span>
          File stats cover the local <code>/uploads</code> and <code>/backups</code> directories on the server.
          Cloudflare R2 (CDN) storage is not tracked here — check the R2 dashboard directly.
        </span>
      </div>
    </div>
  );
}
