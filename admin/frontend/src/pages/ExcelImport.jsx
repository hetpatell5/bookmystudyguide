import { useState } from 'react';
import { FileSpreadsheet, Upload, Download, CheckCircle, XCircle, Loader2, RefreshCw, Info } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../services/api';
import styles from './ExcelImport.module.css';

const TYPES = [
  {
    id: 'main',
    label: 'Main Degrees',
    desc: 'Bulk import main degree categories',
    cols: ['name', 'description', 'color', 'icon'],
    example: [
      { name: 'B.A.', description: 'Bachelor of Arts', color: '#6366f1', icon: 'BookOpen' },
      { name: 'B.Com', description: 'Bachelor of Commerce', color: '#2563eb', icon: 'BarChart3' },
    ],
  },
  {
    id: 'sub',
    label: 'Sub Degrees',
    desc: 'Bulk import sub-degree programmes',
    cols: ['name', 'mainDegreeName', 'description'],
    example: [
      { name: 'Economics', mainDegreeName: 'B.A.', description: 'Economics programme' },
      { name: 'Finance', mainDegreeName: 'B.Com', description: 'Finance programme' },
    ],
  },
  {
    id: 'subject',
    label: 'Subjects',
    desc: 'Bulk import subjects under sub-degrees',
    cols: ['name', 'subDegreeName', 'code', 'description'],
    example: [
      { name: 'Microeconomics', subDegreeName: 'Economics', code: 'ECO-01', description: '' },
    ],
  },
];

export default function ExcelImport() {
  const [type, setType] = useState('main');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const selected = TYPES.find(t => t.id === type);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Only .xlsx, .xls, or .csv files allowed');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const upload = async () => {
    if (!file) { toast.warning('Please select a file first'); return; }
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    try {
      const res = await api.post('/api/excel/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult({ success: true, data: res.data });
      toast.success(`Imported successfully`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setResult({ success: false, error: msg });
      toast.error(`Import failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = async () => {
    try {
      const res = await api.get(`/api/excel/sample/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sample_${type}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Sample downloaded');
    } catch {
      // Fallback: build CSV in browser
      const rows = [selected.cols, ...selected.example.map(r => selected.cols.map(c => r[c] || ''))];
      const csv = rows.map(r => r.join(',')).join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
      a.download = `sample_${type}.csv`;
      a.click();
      toast.success('Sample CSV downloaded');
    }
  };

  const reset = () => { setFile(null); setResult(null); };

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Excel Import</h1>
          <p className="page-sub">Bulk import classifications via Excel or CSV</p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left — Upload */}
        <div>
          {/* Type selector */}
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Import Type</label>
            <div className={styles.typeGrid}>
              {TYPES.map(t => (
                <button
                  key={t.id}
                  className={`${styles.typeBtn} ${type === t.id ? styles.typeActive : ''}`}
                  onClick={() => { setType(t.id); reset(); }}
                >
                  <FileSpreadsheet size={16} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>{selected.desc}</p>
          </div>

          {/* Upload area */}
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <label className="form-label" style={{ margin: 0 }}>Upload File</label>
              <button className="btn btn-outline btn-sm" onClick={downloadSample}>
                <Download size={13} /> Sample
              </button>
            </div>

            <label className={`${styles.dropzone} ${file ? styles.hasFile : ''}`}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
              {file ? (
                <>
                  <FileSpreadsheet size={28} color="var(--color-success)" />
                  <div style={{ fontWeight: 600, marginTop: 8 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </div>
                </>
              ) : (
                <>
                  <Upload size={28} color="var(--text-muted)" />
                  <div style={{ fontWeight: 600, marginTop: 8 }}>Click to select file</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>.xlsx · .xls · .csv</div>
                </>
              )}
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={upload}
                disabled={!file || uploading}
              >
                {uploading ? <><Loader2 size={14} className="spin" /> Importing...</> : <><Upload size={14} /> Import Now</>}
              </button>
              {file && (
                <button className="btn btn-outline btn-icon" onClick={reset} title="Clear">
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`glass-card ${styles.result} ${result.success ? styles.resultOk : styles.resultFail}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {result.success
                  ? <CheckCircle size={16} color="var(--color-success)" />
                  : <XCircle size={16} color="var(--color-danger)" />}
                <span style={{ fontWeight: 600 }}>{result.success ? 'Import Successful' : 'Import Failed'}</span>
              </div>
              <pre className={styles.pre}>
                {result.success
                  ? JSON.stringify(result.data, null, 2)
                  : result.error}
              </pre>
            </div>
          )}
        </div>

        {/* Right — Instructions */}
        <div>
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 600 }}>
              <Info size={15} /> Required Columns
            </div>
            <div className={styles.colList}>
              {selected.cols.map(c => (
                <div key={c} className={styles.colChip}><code>{c}</code></div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.6 }}>
              Column names are case-insensitive and spaces/underscores are ignored. Download the sample file for the exact format.
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Preview (Sample Data)</div>
            <div className={styles.previewTable}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {selected.cols.map(c => (
                      <th key={c} style={{ padding: '6px 10px', background: 'var(--bg-box)', borderBottom: '1px solid var(--border-default)', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.example.map((row, i) => (
                    <tr key={i}>
                      {selected.cols.map(c => (
                        <td key={c} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                          {row[c] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
