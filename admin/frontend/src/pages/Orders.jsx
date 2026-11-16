import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart, Search, Eye, X, RefreshCw, Package,
  Truck, Loader2, MapPin, CheckCircle, Navigation, Tag,
  ReceiptText, Ban, User, CreditCard, Hash, Calendar, Settings2, Save,
  Clock, PackageCheck, AlertCircle, Trash2, Plus, Minus, Phone, Mail,
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import orderService from '../services/orderService';
import api, { BASE_URL } from '../services/api';
import styles from './Orders.module.css';

const STATUSES = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'delivered')               return 'badge-success';
  if (v === 'shipped' || v === 'in transit') return 'badge-info';
  if (v === 'processing')              return 'badge-warning';
  if (v === 'pending')                 return 'badge-warning';
  if (v === 'cancelled')               return 'badge-danger';
  return 'badge-neutral';
};

const isHardCopyOrder = (o) => {
  const items = o.OrderItems || o.products || [];
  return items.some(i => !(i.type && String(i.type).toLowerCase().includes('soft')) && i.isHardCopy !== false);
};

const DIMS_KEY = 'bmsg_shipping_defaults';

const loadDefaults = () => {
  try { return JSON.parse(localStorage.getItem(DIMS_KEY)) || {}; } catch { return {}; }
};
const saveDefaults = (d) => localStorage.setItem(DIMS_KEY, JSON.stringify(d));

const offlineEmpty = {
  customerName: '', email: '', phone: '', street: '', city: '', state: '', pincode: '',
  paidAmount: '', shippingCost: '', serviceFee: '', status: 'Pending', paymentOption: 'offline',
};

/* ══════════════════════════════════════════════════════════════
   ShippingDefaultsModal
══════════════════════════════════════════════════════════════ */
function ShippingDefaultsModal({ onClose }) {
  const [vals, setVals] = useState(() => {
    const d = loadDefaults();
    return {
      length: d.length || '',
      width:  d.width  || '',
      height: d.height || '',
      weight: d.weight || '',
    };
  });

  const set = (k, v) => setVals(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    saveDefaults(vals);
    toast.success('Shipping defaults saved');
    onClose();
  };

  const FIELDS = [
    { k: 'length', label: 'Length', unit: 'cm', ph: '25' },
    { k: 'width',  label: 'Width',  unit: 'cm', ph: '20' },
    { k: 'height', label: 'Height', unit: 'cm', ph: '5'  },
    { k: 'weight', label: 'Weight', unit: 'kg', ph: '0.5'},
  ];

  return (
    <div className={styles.shipOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.defaultsBox}>
        <div className={styles.defaultsHeader}>
          <div>
            <div className={styles.defaultsTitle}><Settings2 size={15} /> Shipping Defaults</div>
            <div className={styles.defaultsSub}>Pre-fill dimensions when packing a courier</div>
          </div>
          <button className={styles.shipBoxClose} onClick={onClose}><X size={14} /></button>
        </div>
        <div className={styles.defaultsBody}>
          <div className={styles.defaultsGrid}>
            {FIELDS.map(({ k, label, unit, ph }) => (
              <div key={k} className={styles.dimField}>
                <label className={styles.dimLabel}>{label}</label>
                <div className={styles.dimInputWrap}>
                  <input
                    className={styles.dimInput}
                    type="number" min="0" step="0.1" placeholder={ph}
                    value={vals[k]}
                    onChange={e => set(k, e.target.value)}
                  />
                  <span className={styles.dimUnit}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <p className={styles.defaultsHint}>
            These values auto-fill in the shipping panel when you pack an order. You can still override them per order.
          </p>
          <div className={styles.defaultsFooter}>
            <button className={styles.backBtn} onClick={onClose}>Cancel</button>
            <button className={styles.nextBtn} style={{ flex: 1 }} onClick={handleSave}>
              <Save size={14} /> Save Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TrackingPanel — Courier live tracking timeline
══════════════════════════════════════════════════════════════ */
const TRACK_STATUS_COLOR = (s = '') => {
  const v = String(s).toLowerCase();
  if (v.includes('delivered'))  return { color: 'var(--color-success)',  bg: 'var(--color-success-bg)' };
  if (v.includes('transit') || v.includes('shipped') || v.includes('dispatched')) return { color: 'var(--color-info)',    bg: 'var(--color-info-bg)' };
  if (v.includes('out for'))    return { color: 'var(--color-purple)',   bg: 'var(--color-purple-bg)' };
  if (v.includes('cancelled') || v.includes('failed') || v.includes('rto')) return { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' };
  return { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' };
};

function TrackingPanel({ trackData, onClose, order }) {
  const td = trackData?.tracking_data || trackData?.shipment_track?.[0] || null;
  const activities = td?.shipment_track_activities || [];
  const status = String(td?.shipment_status || td?.current_status || '—');
  const etd = td?.etd || td?.estimated_delivery_date || null;
  const courierName = td?.courier_name || order?.courierName || '—';
  const origin = td?.origin || '—';
  const destination = td?.destination || '—';
  const { color, bg } = TRACK_STATUS_COLOR(status);

  return (
    <div className={styles.trackPanel}>
      {/* Header */}
      <div className={styles.trackHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Navigation size={14} color="var(--brand-secondary)" />
          <span className={styles.trackTitle}>Live Tracking</span>
        </div>
        <button className={styles.trackCloseBtn} onClick={onClose}><X size={12} /></button>
      </div>

      {!td ? (
        <div className={styles.trackEmpty}>
          <AlertCircle size={28} />
          <p>No tracking data available yet. Try again after pickup is scheduled.</p>
        </div>
      ) : (
        <>
          {/* Status badge */}
          <div className={styles.trackStatusBadge} style={{ background: bg, color }}>
            <PackageCheck size={14} />
            <span>{status}</span>
          </div>

          {/* Meta row */}
          <div className={styles.trackMeta}>
            <div className={styles.trackMetaItem}>
              <span className={styles.trackMetaLabel}>Courier</span>
              <span className={styles.trackMetaVal}>{courierName}</span>
            </div>
            <div className={styles.trackMetaItem}>
              <span className={styles.trackMetaLabel}>AWB</span>
              <span className={styles.trackMetaVal} style={{ fontFamily: 'monospace' }}>{order?.awbCode || '—'}</span>
            </div>
            {etd && (
              <div className={styles.trackMetaItem}>
                <span className={styles.trackMetaLabel}>Est. Delivery</span>
                <span className={styles.trackMetaVal}>{etd}</span>
              </div>
            )}
          </div>

          {/* Route */}
          {(origin !== '—' || destination !== '—') && (
            <div className={styles.trackRoute}>
              <div className={styles.trackRoutePoint}>
                <div className={styles.trackRouteDot} style={{ background: 'var(--color-success)' }} />
                <span>{origin}</span>
              </div>
              <div className={styles.trackRouteLine} />
              <div className={styles.trackRoutePoint}>
                <MapPin size={12} color="var(--brand-secondary)" />
                <span>{destination}</span>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className={styles.trackTimelineWrap}>
            <div className={styles.trackTimelineTitle}>
              <Clock size={12} /> Activity Timeline
            </div>
            {activities.length === 0 ? (
              <p className={styles.trackNoActivity}>No activity recorded yet.</p>
            ) : (
              <div className={styles.trackTimeline}>
                {activities.map((a, i) => {
                  const isFirst = i === 0;
                  const { color: ac } = TRACK_STATUS_COLOR(a.activity || '');
                  return (
                    <div key={i} className={styles.trackTimelineItem}>
                      <div className={styles.trackTimelineLeft}>
                        <div
                          className={styles.trackTimelineDot}
                          style={isFirst ? { background: ac, borderColor: ac } : {}}
                        />
                        {i < activities.length - 1 && <div className={styles.trackTimelineConnector} />}
                      </div>
                      <div className={styles.trackTimelineRight}>
                        <div className={styles.trackTimelineActivity}
                          style={isFirst ? { color: 'var(--text-primary)', fontWeight: 700 } : {}}>
                          {a.activity || '—'}
                        </div>
                        {a.location && (
                          <div className={styles.trackTimelineLoc}>
                            <MapPin size={10} /> {a.location}
                          </div>
                        )}
                        <div className={styles.trackTimelineDate}>{a.date || '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ShipPanel — Shiprocket shipping
══════════════════════════════════════════════════════════════ */
function ShipPanel({ order, onOrderUpdate }) {
  const [step, setStep]       = useState(1); // 1 = dimensions, 2 = courier
  const defaults = loadDefaults();
  const [dims, setDims]       = useState({
    length: defaults.length || '',
    width:  defaults.width  || '',
    height: defaults.height || '',
    weight: defaults.weight || '',
  });
  const [busy, setBusy]       = useState('');
  const [couriers, setCouriers] = useState([]);
  const [picked, setPicked]   = useState('');
  const [trackData, setTrackData] = useState(null);
  const [showTrack, setShowTrack] = useState(false);

  const refresh = async () => {
    try {
      const r = await orderService.getOrderById(order.id);
      const updated = r?.data || r;
      if (updated?.id) onOrderUpdate(updated);
    } catch (e) {
      console.error('Refresh failed:', e);
    }
  };

  const handleNext = async () => {
    setBusy('couriers');
    try {
      if (!order.shiprocketShipmentId) {
        await orderService.createShipment(order.id, {
          length: Number(dims.length) || undefined,
          width:  Number(dims.width)  || undefined,
          height: Number(dims.height) || undefined,
          weight: Number(dims.weight) || undefined,
        });
        await refresh();
      }
      const res  = await orderService.getCouriers(order.id);
      const list = Array.isArray(res.couriers) ? res.couriers : [];
      if (!list.length) { toast.warning('No couriers available for this pincode'); return; }
      setCouriers(list);
      setPicked(String(list[0].courier_id));
      setStep(2);
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to fetch couriers'); }
    finally { setBusy(''); }
  };

  const schedule = async () => {
    if (!picked) { toast.warning('Select a courier'); return; }
    setBusy('schedule');
    try {
      const res = await orderService.scheduleShipment(order.id, picked);
      toast.success(`Pickup scheduled — AWB: ${res.data?.awb || '—'}`);
      await refresh();
      setCouriers([]);
      setStep(1);
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to schedule'); }
    finally { setBusy(''); }
  };

  const track = async () => {
    setBusy('track');
    try {
      const res = await orderService.trackShipment(order.id);
      // backend returns { success, data: <shiprocket tracking obj> }
      const tracking = res?.data || res;
      setTrackData(tracking);
      setShowTrack(true);
    } catch (e) { toast.error(e?.response?.data?.message || 'Tracking failed'); }
    finally { setBusy(''); }
  };

  const download = async (type) => {
    setBusy(type);
    try {
      const res = type === 'label'
        ? await orderService.downloadLabel(order.id)
        : await orderService.downloadInvoice(order.id);
      const url = res?.labelUrl || res?.invoiceUrl;
      if (url) window.open(url, '_blank');
      else toast.warning('Document not available yet');
    } catch (e) { toast.error(e?.response?.data?.message || 'Download failed'); }
    finally { setBusy(''); }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this shipment in Shiprocket?')) return;
    setBusy('cancel');
    try {
      await orderService.cancelShipment(order.id);
      toast.success('Shipment cancelled');
      await refresh();
      setCouriers([]);
      setTrackData(null);
      setShowTrack(false);
      setStep(1);
    } catch (e) { toast.error(e?.response?.data?.message || 'Cancel failed'); }
    finally { setBusy(''); }
  };

  /* ── Already has AWB ── */
  if (order.awbCode) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className={styles.awbPanel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <CheckCircle size={15} color="var(--color-success)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>Shipment Assigned</span>
        </div>
        <div className={styles.awbRow}>
          <span className={styles.awbLabel}>Courier</span>
          <span className={styles.awbVal}>{order.courierName || '—'}</span>
        </div>
        <div className={styles.awbRow}>
          <span className={styles.awbLabel}>AWB Code</span>
          <span className={styles.awbVal}>{order.awbCode}</span>
        </div>
        {order.shiprocketShipmentId && (
          <div className={styles.awbRow}>
            <span className={styles.awbLabel}>Shipment ID</span>
            <span className={styles.awbVal}>{order.shiprocketShipmentId}</span>
          </div>
        )}
        <div className={styles.awbActions}>
          <button className="btn btn-outline btn-sm" onClick={track} disabled={!!busy}>
            {busy === 'track' ? <Loader2 size={12} className={styles.spin} /> : <Navigation size={12} />} Track
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => download('label')} disabled={!!busy}>
            {busy === 'label' ? <Loader2 size={12} className={styles.spin} /> : <Tag size={12} />} Label
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => download('invoice')} disabled={!!busy}>
            {busy === 'invoice' ? <Loader2 size={12} className={styles.spin} /> : <ReceiptText size={12} />} Invoice
          </button>
          <button className="btn btn-outline btn-sm"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            onClick={cancel} disabled={!!busy}>
            {busy === 'cancel' ? <Loader2 size={12} className={styles.spin} /> : <Ban size={12} />} Cancel
          </button>
        </div>
      </div>

      {showTrack && trackData && (
        <TrackingPanel trackData={trackData} onClose={() => setShowTrack(false)} order={order} />
      )}
    </div>
  );

  /* ── Step indicator ── */
  const StepBar = () => (
    <div className={styles.stepBar}>
      {[['1', 'Dimensions'], ['2', 'Select Courier']].map(([n, label], i) => {
        const num = Number(n);
        const done   = step > num;
        const active = step === num;
        return (
          <div key={n} className={styles.stepItem}>
            <div className={`${styles.stepCircle} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}>
              {done ? <CheckCircle size={12} /> : n}
            </div>
            <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ''}`}>{label}</span>
            {i < 1 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />}
          </div>
        );
      })}
    </div>
  );

  /* ── Step 1: Dimensions ── */
  if (step === 1) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StepBar />
      <div className={styles.dimsCard}>
        <div className={styles.dimsCardTitle}>Enter Package Dimensions</div>
        <div className={styles.dimsGrid}>
          {[
            ['length', 'Length', 'cm', '10'],
            ['width',  'Width',  'cm', '10'],
            ['height', 'Height', 'cm', '10'],
            ['weight', 'Weight', 'kg', '0.5'],
          ].map(([k, label, unit, ph]) => (
            <div key={k} className={styles.dimField}>
              <label className={styles.dimLabel}>{label}</label>
              <div className={styles.dimInputWrap}>
                <input
                  className={styles.dimInput}
                  type="number" min="0" step="0.1" placeholder={ph}
                  value={dims[k]}
                  onChange={e => setDims(d => ({ ...d, [k]: e.target.value }))}
                />
                <span className={styles.dimUnit}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button className={styles.nextBtn} onClick={handleNext} disabled={busy === 'couriers'}>
        {busy === 'couriers'
          ? <><Loader2 size={14} className={styles.spin} /> Fetching couriers…</>
          : <><Truck size={14} /> Continue — Fetch Couriers</>}
      </button>
    </div>
  );

  /* ── Step 2: Courier selection ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StepBar />

      {/* Summary of dims */}
      <div className={styles.dimsSummary}>
        <span className={styles.dimsSummaryItem}><strong>L</strong> {dims.length || '—'} cm</span>
        <span className={styles.dimsSummarySep}>·</span>
        <span className={styles.dimsSummaryItem}><strong>W</strong> {dims.width || '—'} cm</span>
        <span className={styles.dimsSummarySep}>·</span>
        <span className={styles.dimsSummaryItem}><strong>H</strong> {dims.height || '—'} cm</span>
        <span className={styles.dimsSummarySep}>·</span>
        <span className={styles.dimsSummaryItem}><strong>Wt</strong> {dims.weight || '—'} kg</span>
        <button className={styles.dimsSummaryEdit} onClick={() => setStep(1)}>Edit</button>
      </div>

      <div className={styles.sectionTitle}>{couriers.length} couriers available</div>
      <div className={styles.courierList}>
        {couriers.map(c => {
          const id = String(c.courier_id);
          const sel = picked === id;
          return (
            <div
              key={id}
              className={`${styles.courierCard} ${sel ? styles.selected : ''}`}
              onClick={() => setPicked(id)}>
              <div className={`${styles.courierRadio} ${sel ? styles.selected : ''}`}>
                {sel && <div className={styles.courierRadioDot} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.courierName}>{c.name}</div>
                <div className={styles.courierModeTag}>{c.is_surface ? 'Surface' : 'Air'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className={styles.courierRate}>₹{fmt(c.rate)}</div>
                <div className={styles.courierDays}>{c.estimated_delivery_days}d est.</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.courierFooter}>
        <button className={styles.backBtn} onClick={() => setStep(1)}>
          ← Back
        </button>
        <button
          className={styles.scheduleBtn}
          onClick={schedule}
          disabled={!picked || !!busy}>
          {busy === 'schedule'
            ? <><Loader2 size={14} className={styles.spin} /> Scheduling…</>
            : <><CheckCircle size={14} /> Confirm &amp; Schedule Pickup</>}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Order Detail Drawer
══════════════════════════════════════════════════════════════ */
const DRAWER_TABS = [
  { id: 'overview', label: 'Overview',  icon: User },
  { id: 'items',    label: 'Items',     icon: Package },
  { id: 'status',   label: 'Status',    icon: Calendar },
];

/* ══════════════════════════════════════════════════════════════
   ManualShipCard — offline shipping without Shiprocket
══════════════════════════════════════════════════════════════ */
function ManualShipCard({ order, onShipped }) {
  const [courier, setCourier] = useState(order.courierName || '');
  const [awb, setAwb]         = useState(order.awbCode || '');
  const [busy, setBusy]       = useState(false);

  const alreadyShipped = !!order.awbCode;

  const handleSave = async () => {
    if (!courier.trim() || !awb.trim()) { toast.warning('Enter both courier name and tracking ID'); return; }
    setBusy(true);
    try {
      await orderService.saveManualShipping(order.id, { courierName: courier, awbCode: awb });
      toast.success('Order marked as Shipped — customer notified');
      onShipped();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to save'); }
    finally { setBusy(false); }
  };

  return (
    <div className={styles.infoCard}>
      <div className={styles.infoCardHead}>
        <Truck size={13} color="var(--text-muted)" />
        <span className={styles.infoCardTitle}>Manual Shipping</span>
        {alreadyShipped && <span style={{ marginLeft: 'auto' }}><span className="badge badge-info">Shipped</span></span>}
      </div>
      <div className={styles.infoCardBody}>
        {alreadyShipped && (
          <div style={{ marginBottom: 10 }}>
            <div className={styles.awbRow}><span className={styles.awbLabel}>Courier</span><span className={styles.awbVal}>{order.courierName}</span></div>
            <div className={styles.awbRow}><span className={styles.awbLabel}>Tracking ID</span><span className={styles.awbVal} style={{ fontFamily: 'monospace' }}>{order.awbCode}</span></div>
          </div>
        )}
        <div className={styles.dimField}>
          <label className={styles.dimLabel}>Courier Name</label>
          <input className={styles.dimInput} placeholder="e.g. DTDC, Delhivery" value={courier} onChange={e => setCourier(e.target.value)} />
        </div>
        <div className={styles.dimField} style={{ marginTop: 8 }}>
          <label className={styles.dimLabel}>Tracking ID / AWB</label>
          <input className={styles.dimInput} placeholder="e.g. 1234567890" value={awb} onChange={e => setAwb(e.target.value)} />
        </div>
        <button className={styles.scheduleBtn} style={{ marginTop: 10, width: '100%' }} onClick={handleSave} disabled={busy}>
          {busy
            ? <><Loader2 size={13} className={styles.spin} /> Saving…</>
            : <><CheckCircle size={13} /> {alreadyShipped ? 'Update & Notify Customer' : 'Save & Notify Customer'}</>}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   IndiaPostCard — India Post manual tracking with customer email
══════════════════════════════════════════════════════════════ */
function IndiaPostCard({ order, onShipped }) {
  const [awb, setAwb]   = useState(order.awbCode || '');
  const [busy, setBusy] = useState(false);

  const alreadyShipped  = !!order.awbCode && order.courierName === 'India Post';

  const handleSend = async () => {
    if (!awb.trim()) { toast.warning('Enter the India Post tracking ID'); return; }
    setBusy(true);
    try {
      await orderService.saveManualShipping(order.id, { courierName: 'India Post', awbCode: awb.trim() });
      toast.success('Tracking ID sent to customer via email & order marked Shipped');
      onShipped();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to save'); }
    finally { setBusy(false); }
  };

  return (
    <div className={styles.indiaPostCard}>
      <div className={styles.indiaPostHead}>
        <Truck size={13} color="#ea580c" />
        <span className={styles.indiaPostHeadTitle}>📮 India Post Shipping</span>
        {alreadyShipped && <span style={{ marginLeft: 'auto' }}><span className="badge badge-success">Shipped</span></span>}
      </div>
      <div className={styles.indiaPostBody}>
        {alreadyShipped && (
          <div className={styles.alreadyShippedInfo}>
            <div className={styles.alreadyShippedRow}>
              <span className={styles.alreadyShippedLabel}>Courier</span>
              <span className={styles.alreadyShippedVal}>India Post</span>
            </div>
            <div className={styles.alreadyShippedRow}>
              <span className={styles.alreadyShippedLabel}>Tracking ID</span>
              <span className={styles.alreadyShippedVal}>{order.awbCode}</span>
            </div>
          </div>
        )}
        <div className={styles.trackingInputWrap}>
          <label className={styles.trackingLabel}>India Post Tracking ID</label>
          <input
            className={styles.trackingInput}
            placeholder="e.g. CX123456789IN"
            value={awb}
            onChange={e => setAwb(e.target.value)}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Customer will receive an email with this tracking ID
          </div>
        </div>
        <button className={styles.indiaPostBtn} onClick={handleSend} disabled={busy || !awb.trim()}>
          {busy
            ? <><Loader2 size={13} className={styles.spin} /> Sending…</>
            : <><CheckCircle size={13} /> {alreadyShipped ? 'Update & Re-notify Customer' : 'Send to Customer & Mark Shipped'}</>}
        </button>
      </div>
    </div>
  );
}


function OrderDrawer({ order, onClose, onStatusUpdate }) {

  const [updating, setUpdating]     = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || '';
      window.open(`${BASE_URL}/api/payment/admin/order/${order.id}/invoice?token=${encodeURIComponent(token)}`, '_blank');
    } catch { toast.error('Failed to download invoice'); }
    finally { setInvoiceLoading(false); }
  };

  // keep chip in sync when status changes externally (e.g. after courier scheduled)
  const manualStatuses = ['Pending', 'Processing', 'Delivered', 'Cancelled'];
  const currentIsManual = manualStatuses.includes(order.status || 'Pending');
  const [updateStatus, setUpdateStatus] = useState(
    currentIsManual ? (order.status || 'Pending') : 'Processing'
  );

  // sync if parent pushes a new status down
  useEffect(() => {
    if (currentIsManual) setUpdateStatus(order.status || 'Pending');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await orderService.updateOrderStatus(order.id, updateStatus);
      toast.success('Status updated');
      onStatusUpdate(order.id, updateStatus);
    } catch { toast.error('Update failed'); }
    finally { setUpdating(false); }
  };

  const items   = order.OrderItems || order.products || [];
  const hasHard = isHardCopyOrder(order);
  const orderTotal = items.reduce((s, i) => s + (i.quantity || 1) * (i.price || 0), 0);

  return (
    <div className={styles.drawerOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.drawerHeader}>
          {/* Top bar: order ID + status badge + close */}
          <div className={styles.drawerHeaderTop}>
            <div className={styles.drawerOrderMeta}>
              <div className={styles.drawerOrderId}>
                <Hash size={14} /> {(order.orderId || order.id || '').slice(-10)}
              </div>
              <div className={styles.drawerOrderDate}>
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </div>
            </div>
            <div className={styles.drawerHeaderRight}>
              <span className={`badge ${statusBadge(order.status)}`}>{order.status || 'Pending'}</span>
              <button className={styles.drawerCloseBtn} onClick={onClose}><X size={14} /></button>
            </div>
          </div>

          {/* ── Customer + Status & Fulfillment strip ── */}
          <div className={styles.drawerStatusStrip}>
            {/* Customer info (left) */}
            <div className={styles.drawerCustomerBlock}>
              <div className={styles.drawerAvatar}>{(order.customerName || 'U')[0].toUpperCase()}</div>
              <div className={styles.drawerCustomerInfo}>
                <div className={styles.drawerCustomerName}>{order.customerName || '—'}</div>
                <div className={styles.drawerCustomerSub}>{order.email} · {order.phone}</div>
              </div>
            </div>

            {/* Status flow + action (center) */}
            <div className={styles.drawerStatusFlowBlock}>
              {/* Progress stepper */}
              {(() => {
                const FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered'];
                const normalised = (order.status || 'Pending');
                const isCancelled = normalised.toLowerCase() === 'cancelled';
                const curIdx = isCancelled ? -1 : FLOW.findIndex(s => s.toLowerCase() === normalised.toLowerCase());
                return isCancelled ? (
                  <div className={styles.cancelledBanner} style={{ margin: 0 }}>
                    <Ban size={13} /> Order Cancelled
                  </div>
                ) : (
                  <div className={styles.statusFlow}>
                    {FLOW.map((s, i, arr) => {
                      const done   = curIdx > i;
                      const active = curIdx === i;
                      return (
                        <div key={s} className={styles.statusFlowItem}>
                          <div className={`${styles.statusFlowDot} ${active ? styles.statusFlowActive : ''} ${done ? styles.statusFlowDone : ''}`}>
                            {done ? <CheckCircle size={10} /> : <span>{i + 1}</span>}
                          </div>
                          <div className={`${styles.statusFlowLabel} ${active ? styles.statusFlowLabelActive : ''}`}>{s}</div>
                          {i < arr.length - 1 && (
                            <div className={`${styles.statusFlowLine} ${done ? styles.statusFlowLineDone : ''}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Status action row — sits directly below the stepper */}
              {order.shiprocketOrderId ? (
                <div className={styles.autoStatusNote} style={{ margin: 0 }}>
                  <Truck size={11} />
                  <span>Managed by <strong>Shiprocket</strong> — auto updates</span>
                </div>
              ) : (
                <div className={styles.drawerStatusActionRow}>
                  {['Pending', 'Processing', 'Delivered', 'Cancelled'].map(s => (
                    <button
                      key={s}
                      className={`${styles.statusChipSm} ${updateStatus === s ? styles.statusChipActive : ''} ${s === 'Cancelled' ? styles.statusChipDanger : ''}`}
                      onClick={() => setUpdateStatus(s)}>
                      {s}
                    </button>
                  ))}
                  <button
                    className={styles.updateBtnInline}
                    onClick={handleUpdate}
                    disabled={updating || updateStatus === order.status}>
                    {updating ? <Loader2 size={11} className={styles.spin} /> : <CheckCircle size={11} />}
                    {updating ? 'Saving…' : `Set "${updateStatus}"`}
                  </button>
                </div>
              )}
            </div>

            {/* Total (right) */}
            <div className={styles.drawerAmountBadge}>
              <div className={styles.drawerAmountLabel}>Total</div>
              <div className={styles.drawerAmountValue}>₹{fmt(order.amount)}</div>
            </div>
          </div>
        </div>

        {/* ── 2-column body: Items | Overview ── */}
        <div className={styles.drawerBody}>
          <div className={styles.drawerGrid}>

            {/* ── Column 1: Items ── */}
            <div className={styles.drawerCol}>
              <div className={styles.drawerColHeader}>
                <div className={styles.drawerColTitle}>
                  <Package size={14} color="var(--brand-secondary)" />
                  <span>Items ({items.length})</span>
                </div>
                <span className={`badge ${hasHard ? 'badge-accent' : 'badge-info'}`}>
                  {hasHard ? 'Hard Copy' : 'Soft Copy'}
                </span>
              </div>
              <div className={styles.drawerColBody}>
                {/* Items table header */}
                <div className={styles.itemsTableHead}>
                  <div className={styles.itemsTableHeadCell}>#</div>
                  <div className={styles.itemsTableHeadCell}>Item</div>
                  <div className={styles.itemsTableHeadCell}>SKU / Type</div>
                  <div className={styles.itemsTableHeadCell} style={{ textAlign: 'center' }}>Qty</div>
                  <div className={styles.itemsTableHeadCell} style={{ textAlign: 'right' }}>Price</div>
                </div>
                <div className={styles.itemsList}>
                  {items.map((item, i) => {
                    // Use stored language first; fall back to current Product.language from DB join
                    const itemLang = item.language || item.Product?.language || item.Product?.Language?.name || null;
                    let displaySku = item.sku && item.sku !== 'NO-SKU' ? item.sku : null;
                    if (displaySku && itemLang) {
                      const langSuffix = `-${itemLang.toUpperCase()}`;
                      if (!displaySku.toUpperCase().endsWith(langSuffix)) {
                        displaySku = `${displaySku}-${itemLang.toUpperCase()}`;
                      }
                    }
                    if (displaySku) displaySku = displaySku.toUpperCase();
                    return (
                      <div key={i} className={styles.itemRow}>
                        <div className={styles.itemIndex}>{i + 1}</div>
                        <div className={styles.itemDetails}>
                          <div className={styles.itemTitle}>{item.title || item.name || '—'}</div>
                        </div>
                        <div className={styles.itemSkuCol}>
                          {displaySku && <span className={styles.itemSkuBadge} title={displaySku}>{displaySku}</span>}
                          {!displaySku && item.language && (
                            <span className={styles.itemSkuBadge} style={{ color: 'var(--color-info,#0ea5e9)', background: 'rgba(14,165,233,.08)', borderColor: 'rgba(14,165,233,.2)' }}>🌐 {item.language}</span>
                          )}
                          {item.type && <div className={styles.itemType}>{item.type}</div>}
                        </div>
                        <div className={styles.itemQty}>×{item.quantity || 1}</div>
                        <div className={styles.itemPricing}>
                          <div className={styles.itemTotal}>₹{fmt((item.quantity || 1) * (item.price || 0))}</div>
                          <div className={styles.itemUnit}>₹{fmt(item.price)} each</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.itemsSummary}>
                  <div className={styles.itemsSummaryRow}>
                    <span>Subtotal</span>
                    <span>₹{fmt(orderTotal)}</span>
                  </div>
                  {Number(order.shippingCost) > 0 && (
                    <div className={styles.itemsSummaryRow}>
                      <span>Shipping</span>
                      <span>₹{fmt(order.shippingCost)}</span>
                    </div>
                  )}
                  {Number(order.serviceFee) > 0 && (
                    <div className={styles.itemsSummaryRow}>
                      <span>Service Fee</span>
                      <span>₹{fmt(order.serviceFee)}</span>
                    </div>
                  )}
                  <div className={`${styles.itemsSummaryRow} ${styles.itemsSummaryTotal}`}>
                    <span>Order Total</span>
                    <span>₹{fmt(order.amount)}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Column 2: Overview ── */}
            <div className={styles.drawerCol}>
              <div className={styles.drawerColHeader}>
                <div className={styles.drawerColTitle}>
                  <User size={14} color="var(--brand-secondary)" />
                  <span>Overview</span>
                </div>
              </div>
              <div className={styles.drawerColBody}>

                {/* India Post shipping */}
                {!order.shiprocketOrderId && (
                  <IndiaPostCard
                    order={order}
                    onShipped={() => onStatusUpdate(order.id, 'Shipped')}
                  />
                )}

                {/* Address */}
                {order.street && (
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardHead}>
                      <MapPin size={13} color="var(--text-muted)" />
                      <span className={styles.infoCardTitle}>Shipping Address</span>
                    </div>
                    <div className={styles.infoCardBody}>
                      <div className={styles.addressBlock}>
                        <div className={styles.addressLine}>{order.street}</div>
                        <div className={styles.addressLine}>{order.city}, {order.state}</div>
                        <div className={styles.addressPincode}>PIN — {order.pincode}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment */}
                <div className={styles.infoCard}>
                  <div className={styles.infoCardHead}>
                    <CreditCard size={13} color="var(--text-muted)" />
                    <span className={styles.infoCardTitle}>Payment</span>
                    <span style={{ marginLeft: 'auto' }}>
                      <span className={`badge ${order.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                        {order.paymentStatus || '—'}
                      </span>
                    </span>
                  </div>
                  <div className={styles.infoCardBody}>
                    <div className={styles.payRow}>
                      <span className={styles.infoLabel}>Subtotal</span>
                      <span className={styles.infoValue}>₹{fmt(Number(order.amount || 0) - Number(order.shippingCost || 0) - Number(order.serviceFee || 0))}</span>
                    </div>
                    {Number(order.shippingCost) > 0 && (
                      <div className={styles.payRow}>
                        <span className={styles.infoLabel}>Shipping</span>
                        <span className={styles.infoValue}>₹{fmt(order.shippingCost)}</span>
                      </div>
                    )}
                    {Number(order.serviceFee) > 0 && (
                      <div className={styles.payRow}>
                        <span className={styles.infoLabel}>Service Fee</span>
                        <span className={styles.infoValue}>₹{fmt(order.serviceFee)}</span>
                      </div>
                    )}
                    <div className={`${styles.payRow} ${styles.payRowTotal}`}>
                      <span className={styles.infoLabel}>Total Bill</span>
                      <span className={styles.infoValue}>₹{fmt(order.amount)}</span>
                    </div>
                    <div className={styles.payRow}>
                      <span className={styles.infoLabel}>Amount Paid</span>
                      <span className={`${styles.infoValue} ${styles.paySuccess}`}>₹{fmt(order.paidAmount)}</span>
                    </div>
                    {Number(order.dueAmount) > 0 && (
                      <div className={`${styles.payRow} ${styles.payRowTotal}`}>
                        <span className={styles.infoLabel}>Due (Cash)</span>
                        <span className={`${styles.infoValue} ${styles.payDanger}`}>₹{fmt(order.dueAmount)}</span>
                      </div>
                    )}
                    {order.paymentMode && (
                      <div className={styles.payRow}>
                        <span className={styles.infoLabel}>Mode</span>
                        <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>
                          {order.paymentMode === 'half_online' ? 'Half Online + Half COD' : order.paymentMode.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {order.paymentId && (
                      <div className={styles.txnRow}>
                        <span className={styles.infoLabel}>Transaction ID</span>
                        <code className={styles.txnCode}>{order.paymentId}</code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice */}
                <div className={styles.infoCard}>
                  <div className={styles.infoCardHead}>
                    <ReceiptText size={13} color="var(--text-muted)" />
                    <span className={styles.infoCardTitle}>Invoice</span>
                  </div>
                  <div className={styles.infoCardBody}>
                    <button className="btn btn-outline btn-sm" disabled={invoiceLoading} onClick={handleDownloadInvoice}>
                      {invoiceLoading
                        ? <><Loader2 size={12} className={styles.spin} /> Generating…</>
                        : <><ReceiptText size={12} /> Download Invoice (PDF)</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   Ship Modal
══════════════════════════════════════════════════════════════ */
function ShipModal({ order, onClose, onOrderUpdate }) {
  return (
    <div className={styles.shipOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.shipBox}>
        <div className={styles.shipBoxHeader}>
          <div>
            <div className={styles.shipBoxTitle}><Truck size={16} /> Shiprocket Shipping</div>
            <div className={styles.shipBoxSub}>
              Order #{(order.orderId || order.id || '').slice(-10)} · {order.customerName}
            </div>
          </div>
          <button className={styles.shipBoxClose} onClick={onClose}><X size={14} /></button>
        </div>
        <div className={styles.shipBoxBody}>
          {/* Meta strip */}
          <div className={styles.shipMeta}>
            <span className={styles.shipMetaName}>{order.customerName}</span>
            {order.city && (
              <span className={styles.shipMetaLoc}>
                <MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />
                {order.city}, {order.state} — {order.pincode}
              </span>
            )}
            <span className={`badge ${statusBadge(order.status)}`}>{order.status || 'Pending'}</span>
          </div>

          <ShipPanel order={order} onOrderUpdate={onOrderUpdate} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Orders page
══════════════════════════════════════════════════════════════ */
function OfflineOrderModal({ onClose, onCreated }) {
  const [form, setForm] = useState(offlineEmpty);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [createdLink, setCreatedLink] = useState('');

  useEffect(() => {
    api.get('/api/payment/admin/sellable-items')
      .then(res => setProducts(res.data?.data || res.data || []))
      .catch(() => toast.error('Failed to load sellable items'));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const total = subtotal + Number(form.shippingCost || 0) + Number(form.serviceFee || 0);
  const due = Math.max(total - Number(form.paidAmount || 0), 0);

  const addProduct = () => {
    const product = products.find(p => String(p.id) === String(selectedProductId));
    if (!product) return;
    setItems(prev => {
      const existing = prev.find(item => item.rowId === product.id);
      if (existing) return prev.map(item => item.rowId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, {
        rowId: product.id,
        productId: product.productId,
        title: product.title,
        sku: product.sku,
        price: Number(product.price || 0),
        quantity: 1,
        type: product.type,
        image: product.image || '',
        language: product.language || '',
        fileUrl: product.fileUrl || '',
      }];
    });
    setSelectedProductId('');
  };

  const updateItem = (productId, key, value) => {
    setItems(prev => prev.map(item => item.rowId === productId ? { ...item, [key]: value } : item));
  };

  const handleSave = async () => {
    if (!form.customerName || !form.phone) return toast.error('Customer name and phone are required');
    if (!items.length) return toast.error('Add at least one product');
    setSaving(true);
    try {
      const res = await orderService.createOfflineOrder({
        customerName: form.customerName,
        email: form.email,
        phone: form.phone,
        address: { street: form.street, city: form.city, state: form.state, pincode: form.pincode },
        products: items,
        paidAmount: Number(form.paidAmount || 0),
        shippingCost: Number(form.shippingCost || 0),
        serviceFee: Number(form.serviceFee || 0),
        paymentMode: form.paymentOption === 'offline' ? 'offline' : form.paymentOption,
        paymentOption: form.paymentOption,
        generatePaymentLink: form.paymentOption !== 'offline',
        status: form.status,
      });
      if (res.data?.paymentLinkUrl) {
        setCreatedLink(res.data.paymentLinkUrl);
        navigator.clipboard?.writeText(res.data.paymentLinkUrl).catch(() => {});
        toast.success('Order created and Razorpay link copied');
      } else {
        toast.success('Offline order created');
      }
      onCreated(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create offline order');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const q = productQuery.toLowerCase();
    return !q || [p.title, p.sku, p.type, p.kind, p.language].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-lg fade-in ${styles.offlineModal}`}>
        <div className="modal-header">
          <h2 className="modal-title">Create Offline Order</h2>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className={styles.offlineSectionTitle}>Customer</div>
          <div className="grid-3" style={{ marginBottom: 14 }}>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.customerName} onChange={e => set('customerName', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Phone *</label><input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          </div>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.street} onChange={e => set('street', e.target.value)} /></div>
            <div className="grid-3">
              <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">State</label><input className="form-input" value={form.state} onChange={e => set('state', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Pincode</label><input className="form-input" value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
            </div>
          </div>
          <div className={styles.offlineSectionTitle}>Items</div>
          <div className={styles.offlineSearch}>
            <Search size={13} />
            <input value={productQuery} onChange={e => setProductQuery(e.target.value)} placeholder="Search title, SKU, combo, project, soft copy..." />
          </div>
          <div className={styles.offlineAddRow}>
            <select className="form-select" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
              <option value="">Select item</option>
              {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.title} - {p.type} {p.sku ? `(${p.sku})` : ''}</option>)}
            </select>
            <button className="btn btn-primary" onClick={addProduct} disabled={!selectedProductId}><Plus size={14} /> Add</button>
          </div>
          <div className={styles.offlineItems}>
            {items.map(item => (
              <div className={styles.offlineItem} key={item.rowId}>
                <div className={styles.offlineItemTitle}><strong>{item.title}</strong><span>{item.sku || 'No SKU'} - {item.type}</span></div>
                <input className="form-input" type="number" min="0" value={item.price} onChange={e => updateItem(item.rowId, 'price', e.target.value)} />
                <div className={styles.qtyBox}>
                  <button onClick={() => updateItem(item.rowId, 'quantity', Math.max(1, item.quantity - 1))}><Minus size={12} /></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateItem(item.rowId, 'quantity', item.quantity + 1)}><Plus size={12} /></button>
                </div>
                <button className="action-btn del" onClick={() => setItems(prev => prev.filter(x => x.rowId !== item.rowId))}><Trash2 size={13} /></button>
              </div>
            ))}
            {items.length === 0 && <div className={styles.offlineEmpty}>No products added yet</div>}
          </div>
          <div className={styles.offlineSectionTitle}>Payment</div>
          <div className="grid-3">
            <div className="form-group"><label className="form-label">Payment Option</label><select className="form-select" value={form.paymentOption} onChange={e => set('paymentOption', e.target.value)}><option value="offline">Record Offline Payment</option><option value="full_online">Generate Full Online Link</option><option value="half_online">Generate Half Online + COD Link</option></select></div>
            <div className="form-group"><label className="form-label">Paid Amount</label><input className="form-input" type="number" min="0" value={form.paidAmount} onChange={e => set('paidAmount', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Shipping</label><input className="form-input" type="number" min="0" value={form.shippingCost} onChange={e => set('shippingCost', e.target.value)} /></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className={styles.offlineTotals}>
            <span>Subtotal ₹{fmt(subtotal)}</span>
            {Number(form.shippingCost) > 0 && <span>+ Shipping ₹{fmt(Number(form.shippingCost))}</span>}
            {Number(form.serviceFee) > 0 && <span>+ Service Fee ₹{fmt(Number(form.serviceFee))}</span>}
            <span>= Total ₹{fmt(total)}</span>
            <strong>Due ₹{fmt(due)}</strong>
          </div>
          {createdLink && <div className={styles.paymentLinkBox}><span>{createdLink}</span><button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard?.writeText(createdLink)}>Copy</button></div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <><Loader2 size={13} className={styles.spin} /> Creating...</> : <><Save size={13} /> Create Order</>}</button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [drawerOrder, setDrawerOrder]   = useState(null);
  const [shipOrder, setShipOrder]       = useState(null);
  const [showDefaults, setShowDefaults] = useState(false);
  const [showOfflineOrder, setShowOfflineOrder] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await orderService.getAllOrders();
      setOrders(res.data || res || []);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(o => {
      const matchQ = !q ||
        (o.orderId || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.email || '').toLowerCase().includes(q) ||
        (o.phone || '').includes(q);
      const matchS = statusFilter === 'All' || (o.status || '').toLowerCase() === statusFilter.toLowerCase();
      const hard   = isHardCopyOrder(o);
      const matchT = typeFilter === 'All' ||
                     (typeFilter === 'Hard Copy' && hard) ||
                     (typeFilter === 'Soft Copy' && !hard);
                     
      let matchD = true;
      if (dateFilter && o.createdAt) {
        // Convert to local YYYY-MM-DD
        const d = new Date(o.createdAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        matchD = `${y}-${m}-${day}` === dateFilter;
      }

      return matchQ && matchS && matchT && matchD;
    });
  }, [orders, search, statusFilter, typeFilter, dateFilter]);

  const stats = useMemo(() => ({
    total:      orders.length,
    pending:    orders.filter(o => o.status?.toLowerCase() === 'pending').length,
    processing: orders.filter(o => o.status?.toLowerCase() === 'processing').length,
    shipped:    orders.filter(o => o.status?.toLowerCase() === 'shipped').length,
    delivered:  orders.filter(o => o.status?.toLowerCase() === 'delivered').length,
  }), [orders]);

  const handleStatusUpdate = (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (drawerOrder?.id === id) setDrawerOrder(prev => ({ ...prev, status }));
  };

  const handleDelete = async (o) => {
    if (!window.confirm(`Delete order #${o.orderId}? This cannot be undone.`)) return;
    try {
      await orderService.deleteOrder(o.id);
      setOrders(prev => prev.filter(x => x.id !== o.id));
      toast.success('Order deleted');
    } catch { toast.error('Failed to delete order'); }
  };

  const handleOrderUpdate = (updated) => {
    // updated is already the fresh order from refresh() in the ship modal
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    setShipOrder(updated);
    if (drawerOrder?.id === updated.id) setDrawerOrder(updated);
  };

  const STAT_CARDS = [
    { label: 'Total',      value: stats.total,      color: 'var(--color-info)',    bg: 'var(--color-info-bg)',    filter: 'All' },
    { label: 'Pending',    value: stats.pending,    color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', filter: 'Pending' },
    { label: 'Processing', value: stats.processing, color: 'var(--color-purple)',  bg: 'var(--color-purple-bg)',  filter: 'Processing' },
    { label: 'Shipped',    value: stats.shipped,    color: 'var(--color-info)',    bg: 'var(--color-info-bg)',    filter: 'Shipped' },
    { label: 'Delivered',  value: stats.delivered,  color: 'var(--color-success)', bg: 'var(--color-success-bg)', filter: 'Delivered' },
  ];

  return (
    <div className={styles.page}>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">{orders.length} total orders</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowOfflineOrder(true)}>
            <Plus size={13} /> Offline Order
          </button>
          <button className="btn btn-outline btn-sm" onClick={fetchOrders}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowDefaults(true)}>
            <Settings2 size={13} /> Shipping Defaults
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {STAT_CARDS.map(s => (
          <div
            key={s.label}
            className={`${styles.statCard} ${statusFilter === s.filter ? styles.active : ''}`}
            onClick={() => setStatusFilter(s.filter)}>
            <div className={styles.statIcon} style={{ background: s.bg, color: s.color }}>
              <Package size={18} />
            </div>
            <div className={styles.statBody}>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="section-block">
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <Search size={14} color="var(--text-muted)" />
            <input
              className={styles.searchInput}
              placeholder="Search order ID, customer, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            <option value="Hard Copy">Hard Copy</option>
            <option value="Soft Copy">Soft Copy</option>
          </select>
          <input
            type="date"
            className={styles.filterSelect}
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{ padding: '0 8px', color: dateFilter ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            title="Filter by date"
          />
          <div className={styles.statusTabs}>
            {STATUSES.map(s => (
              <button
                key={s}
                className={`${styles.statusTab} ${statusFilter === s ? styles.active : ''}`}
                onClick={() => setStatusFilter(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>SKU</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const hard = isHardCopyOrder(o);
                  const skus = (o.OrderItems || o.products || []).map(i => {
                    if (!i.sku || i.sku === 'NO-SKU') return null;
                    const iLang = i.language || i.Product?.language || i.Product?.Language?.name || null;
                    let displaySku = i.sku;
                    if (iLang) {
                      const langSuffix = `-${iLang.toUpperCase()}`;
                      if (!displaySku.toUpperCase().endsWith(langSuffix)) {
                        displaySku = `${displaySku}-${iLang.toUpperCase()}`;
                      }
                    }
                    return displaySku.toUpperCase();
                  }).filter(Boolean);

                  return (
                    <tr key={o.id}>
                      <td className={styles.date}>
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td>
                        <div className={styles.customerCell}>
                          <span className={styles.customerOrderId}>
                            #{(o.orderId || o.id || '').slice(-8)}
                          </span>
                          <div className={styles.customerName}>{o.customerName || '—'}</div>
                          {o.email && (
                            <div className={styles.customerEmail} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Mail size={10} /> {o.email}
                            </div>
                          )}
                          {o.phone && (
                            <div className={styles.customerEmail} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success)' }}>
                              <Phone size={10} /> {o.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={styles.skuList}>
                          {skus.length > 0 ? (
                            skus.map((sku, idx) => (
                              <div key={idx} className={styles.skuItem}>
                                {sku}{idx < skus.length - 1 ? ',' : ''}
                              </div>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${hard ? 'badge-accent' : 'badge-info'}`}>
                          {hard ? 'Hard Copy' : 'Soft Copy'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.amount}>₹{fmt(o.amount)}</span>
                      </td>
                      <td>
                        {Number(o.dueAmount) > 0
                          ? <span className="badge badge-warning">₹{fmt(o.dueAmount)} due</span>
                          : <span style={{ fontSize: 12, color: 'var(--color-success)' }}>—</span>}
                      </td>
                      <td>
                        <span className={`badge ${o.paymentStatus === 'Paid' ? 'badge-success' : o.paymentStatus === 'Partial' ? 'badge-warning' : 'badge-neutral'}`}>
                          {o.paymentStatus || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(o.status)}`}>{o.status || 'Pending'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="action-btn view" title="View Details" onClick={() => setDrawerOrder(o)}>
                            <Eye size={13} />
                          </button>
                          {hard && (o.status || '').toLowerCase() !== 'cancelled' && (
                            <button
                              className="action-btn"
                              title={o.awbCode ? 'Track Shipment' : 'Ship Order'}
                              onClick={() => setShipOrder(o)}
                              style={o.awbCode ? { color: 'var(--color-success)' } : {}}>
                              <Truck size={13} />
                            </button>
                          )}
                          <button
                            className="action-btn"
                            title="Delete Order"
                            onClick={() => handleDelete(o)}
                            style={{ color: 'var(--color-danger)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9}>
                    <div className="empty-state">
                      <ShoppingCart size={40} />
                      <h3>No orders found</h3>
                      <p>Try adjusting your search or filters</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      {drawerOrder && (
        <OrderDrawer
          order={drawerOrder}
          onClose={() => setDrawerOrder(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Shiprocket Modal */}
      {shipOrder && (
        <ShipModal
          order={shipOrder}
          onClose={() => setShipOrder(null)}
          onOrderUpdate={handleOrderUpdate}
        />
      )}

      {/* Shipping Defaults Modal */}
      {showDefaults && (
        <ShippingDefaultsModal onClose={() => setShowDefaults(false)} />
      )}

      {showOfflineOrder && (
        <OfflineOrderModal
          onClose={() => setShowOfflineOrder(false)}
          onCreated={(order) => {
            setOrders(prev => [order, ...prev]);
            setShowOfflineOrder(false);
          }}
        />
      )}
    </div>
  );
}
