import { useState, useEffect } from 'react';
import { CreditCard, Search, RefreshCw, RotateCcw, Loader2, X, Phone, Mail } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../services/api';
import styles from './Payments.module.css';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refundModal, setRefundModal] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refunding, setRefunding] = useState(false);

  const fetchPayments = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/api/payment/admin/all-payments', {
        params: { page: p, limit: 20, search: search || undefined, status: statusFilter || undefined }
      });
      setPayments(res.data.data || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayments(1); setPage(1); }, [search, statusFilter]);

  const handleRefund = async () => {
    if (!refundModal) return;
    setRefunding(true);
    try {
      await api.post(`/api/payment/admin/refund/${refundModal.id}`, {
        amount: refundAmount ? Number(refundAmount) : undefined,
        notes: refundNote,
      });
      toast.success('Refund initiated');
      setRefundModal(null);
      fetchPayments(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refund failed');
    } finally { setRefunding(false); }
  };

  const totalRev = payments.reduce((s, p) => s + Number(p.paidAmount || 0), 0);
  const totalDue = payments.reduce((s, p) => s + Number(p.dueAmount || 0), 0);
  const totalRefunded = payments.reduce((s, p) => s + Number(p.refundAmount || 0), 0);

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-sub">Manage transactions and refunds</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => fetchPayments(page)}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(5,150,105,.1)', color: '#059669' }}><CreditCard size={16}/></div>
          <div className="stat-body"><div className="stat-label">Collected</div><div className="stat-value">&#x20B9;{totalRev.toLocaleString('en-IN')}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(234,179,8,.1)', color: '#ca8a04' }}><CreditCard size={16}/></div>
          <div className="stat-body"><div className="stat-label">Cash Due</div><div className="stat-value">&#x20B9;{totalDue.toLocaleString('en-IN')}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,.1)', color: '#2563eb' }}><CreditCard size={16}/></div>
          <div className="stat-body"><div className="stat-label">Transactions</div><div className="stat-value">{payments.length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,.1)', color: '#dc2626' }}><RotateCcw size={16}/></div>
          <div className="stat-body"><div className="stat-label">Refunded</div><div className="stat-value">&#x20B9;{totalRefunded.toLocaleString('en-IN')}</div></div>
        </div>
      </div>

      <div className="section-block">
        <div className="filter-bar">
          <div className="search-wrap">
            <Search size={14}/>
            <input className="search-input" placeholder="Search order, customer, payment ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Pending">Pending</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>

        {loading ? <div className="loading-overlay"><div className="spinner"/></div> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th><th>Customer</th><th>Amount</th><th>Paid</th><th>Due</th>
                    <th>Status</th><th>Refund</th><th>Payment ID</th><th>Mode</th><th>Date</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontSize:12, fontFamily:'monospace', color:'var(--brand-secondary)', fontWeight:600 }}>
                        #{(p.orderId||p.id||'').slice(-8)}
                      </td>
                      <td>
                        <div style={{ fontWeight:600 }}>{p.customerName||'—'}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3 }}><Mail size={10}/> {p.email}</div>
                        {p.phone && <div style={{ fontSize:11, color:'var(--color-success)', display:'flex', alignItems:'center', gap:3 }}><Phone size={10}/> {p.phone}</div>}
                      </td>
                      <td style={{ fontWeight:700 }}>&#x20B9;{Number(p.amount||0).toLocaleString('en-IN')}</td>
                      <td style={{ color:'var(--color-success)', fontWeight:600 }}>&#x20B9;{Number(p.paidAmount||0).toLocaleString('en-IN')}</td>
                      <td>
                        {Number(p.dueAmount) > 0
                          ? <span className="badge badge-warning">₹{Number(p.dueAmount).toLocaleString('en-IN')}</span>
                          : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>}
                      </td>
                      <td>
                        <span className={`badge ${p.paymentStatus==='Paid'?'badge-success':p.paymentStatus==='Refunded'?'badge-danger':p.paymentStatus==='Partial'?'badge-warning':'badge-neutral'}`}>
                          {p.paymentStatus||'—'}
                        </span>
                      </td>
                      <td>
                        {p.refundStatus && p.refundStatus !== 'None'
                          ? <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                              <span className={`badge ${p.refundStatus==='Full'?'badge-danger':'badge-warning'}`}>{p.refundStatus}</span>
                              {Number(p.refundAmount) > 0 && (
                                <span style={{ fontSize:11, color:'var(--color-danger)', fontWeight:600 }}>
                                  ₹{Number(p.refundAmount).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}
                                </span>
                              )}
                            </div>
                          : <span className="text-muted text-sm">—</span>
                        }
                      </td>
                      <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--text-muted)', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                          title={p.paymentId||''}>
                        {p.paymentId || '—'}
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                        {p.paymentMode === 'half_online' ? 'Half Online + COD' : p.paymentMode ? p.paymentMode.replace(/_/g,' ') : '—'}
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}
                      </td>
                      <td>
                        {p.paymentId && p.refundStatus !== 'Full' && (
                          <button className="action-btn" title="Refund"
                            onClick={() => { setRefundModal(p); setRefundAmount(''); setRefundNote(''); }}>
                            <RotateCcw size={13}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={11}>
                      <div className="empty-state"><CreditCard size={36}/><h3>No payments found</h3></div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display:'flex', justifyContent:'center', gap:8, padding:'14px' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>Prev</button>
                <span style={{ fontSize:13, color:'var(--text-muted)', alignSelf:'center' }}>Page {page} / {totalPages}</span>
                <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {refundModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRefundModal(null); }}>
          <div className="modal modal-sm fade-in">
            <div className="modal-header">
              <h2 className="modal-title">Initiate Refund</h2>
              <button className="modal-close" onClick={() => setRefundModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              {(() => {
                const alreadyRefunded = Number(refundModal.refundAmount || 0);
                const maxRefundable = Number(refundModal.paidAmount || 0) - alreadyRefunded;
                return (
                  <>
                    <div style={{ fontSize:13, marginBottom:16, color:'var(--text-secondary)', display:'flex', flexDirection:'column', gap:4 }}>
                      <span>Order <strong>#{(refundModal.orderId||'').slice(-8)}</strong></span>
                      <span>Paid: <strong>₹{Number(refundModal.paidAmount||0).toLocaleString('en-IN')}</strong>
                        {alreadyRefunded > 0 && <span style={{ color:'var(--color-danger)', marginLeft:8 }}>· Already refunded: ₹{alreadyRefunded.toLocaleString('en-IN')}</span>}
                      </span>
                      <span style={{ color:'var(--color-success)', fontWeight:600 }}>Refundable: ₹{maxRefundable.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="form-group" style={{ marginBottom:12 }}>
                      <label className="form-label">Refund Amount (blank = full ₹{maxRefundable.toLocaleString('en-IN')})</label>
                      <input className="form-input" type="number" min="1" max={maxRefundable} placeholder={`Max ${maxRefundable}`} value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
                    </div>
                  </>
                );
              })()}
              <div className="form-group">
                <label className="form-label">Reason / Notes</label>
                <textarea className="form-textarea" placeholder="Optional..." value={refundNote} onChange={e => setRefundNote(e.target.value)} rows={3}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setRefundModal(null)}>Cancel</button>
              <button className="btn btn-danger-soft" onClick={handleRefund} disabled={refunding}>
                {refunding ? <><Loader2 size={13} className={styles.spin}/> Processing...</> : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
