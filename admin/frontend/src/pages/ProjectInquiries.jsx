import React, { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb, Search, RefreshCcw, Trash2, ChevronDown,
  Loader2, Inbox, Phone, Mail, GraduationCap,
  MapPin, StickyNote, Calendar, Briefcase, FlaskConical,
  Presentation, Building2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import styles from './AssignmentInquiries.module.css'; // Reuse same styles

const STATUS_OPTIONS = ['pending', 'in-progress', 'completed', 'cancelled'];

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  'in-progress': { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
};

const TYPE_ICONS = {
  Project: Lightbulb,
  Practical: FlaskConical,
  Synopsis: Presentation,
  Internship: Building2,
};

const INQUIRY_TYPE_OPTIONS = ['all', 'Project', 'Practical', 'Synopsis', 'Internship'];

export default function ProjectInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchInquiries = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.inquiryType = typeFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/api/project-inquiries', { params });
      setInquiries(res.data?.data || []);
      if (res.data?.pagination) setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => fetchInquiries(1), 350);
    return () => clearTimeout(t);
  }, [fetchInquiries]);

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await api.patch(`/api/project-inquiries/${id}`, { status: newStatus });
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inquiry permanently?')) return;
    try {
      await api.delete(`/api/project-inquiries/${id}`);
      setInquiries(prev => prev.filter(i => i.id !== id));
      toast.success('Inquiry deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Inquiries</h1>
          <p className="page-subtitle">Student requests for projects, practicals, synopsis &amp; internship reports</p>
        </div>
        <button className="btn-ghost" onClick={() => fetchInquiries(pagination.page)} title="Refresh">
          <RefreshCcw size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by name, email, mobile, subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.statusFilter}>
          {['all', ...STATUS_OPTIONS].map(s => (
            <button
              key={s}
              className={`${styles.filterBtn}${statusFilter === s ? ` ${styles.filterBtnActive}` : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All Status' : STATUS_COLORS[s]?.label}
            </button>
          ))}
        </div>
        <div className={styles.statusFilter}>
          {INQUIRY_TYPE_OPTIONS.map(t => (
            <button
              key={t}
              className={`${styles.filterBtn}${typeFilter === t ? ` ${styles.filterBtnActive}` : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.countRow}>
        <span>{pagination.total} total inquiries</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-state">
          <Loader2 size={32} className="spinner" />
          <p>Loading inquiries...</p>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="empty-state">
          <Inbox size={40} />
          <p>No inquiries found.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Type</th>
                <th>Degree / Subject</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq, idx) => {
                const statusStyle = STATUS_COLORS[inq.status] || STATUS_COLORS.pending;
                const isExpanded = expandedId === inq.id;
                const TypeIcon = TYPE_ICONS[inq.inquiryType] || Lightbulb;
                return (
                  <React.Fragment key={inq.id}>
                    <tr className={styles.row} onClick={() => setExpandedId(isExpanded ? null : inq.id)}>
                      <td className={styles.numCell}>{idx + 1}</td>
                      <td>
                        <div className={styles.studentName}>{inq.name}</div>
                        <div className={styles.studentMeta}><Phone size={11} /> {inq.mobileNumber}</div>
                        <div className={styles.studentMeta}><Mail size={11} /> {inq.email}</div>
                      </td>
                      <td>
                        <span className={styles.pill} style={{ gap: 6 }}>
                          <TypeIcon size={12} /> {inq.inquiryType}
                        </span>
                      </td>
                      <td>
                        <div className={styles.degreeText}>{inq.mainDegree || '—'}</div>
                        <div className={styles.subText}>{inq.subDegree || '—'}</div>
                        {inq.subject && <div className={styles.subText}>{inq.subject}</div>}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className={styles.statusWrap}>
                          <span className={styles.statusBadge} style={{ background: statusStyle.bg, color: statusStyle.color }}>
                            {statusStyle.label}
                          </span>
                          <div className={styles.selectWrap}>
                            {updatingId === inq.id
                              ? <Loader2 size={14} className="spinner" />
                              : (
                                <>
                                  <select
                                    className={styles.statusSelect}
                                    value={inq.status}
                                    onChange={e => handleStatusChange(inq.id, e.target.value)}
                                  >
                                    {STATUS_OPTIONS.map(s => (
                                      <option key={s} value={s}>{STATUS_COLORS[s]?.label}</option>
                                    ))}
                                  </select>
                                  <ChevronDown size={12} className={styles.selectArrow} />
                                </>
                              )}
                          </div>
                        </div>
                      </td>
                      <td className={styles.dateCell}>
                        {new Date(inq.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          className="btn-danger"
                          style={{ padding: '5px 8px' }}
                          onClick={() => handleDelete(inq.id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {/* Expanded Row */}
                    {isExpanded && (
                      <tr className={styles.expandedRow}>
                        <td colSpan={7}>
                          <div className={styles.expandedContent}>
                            <div className={styles.expandedGrid}>
                              {inq.enrollmentNumber && (
                                <div className={styles.expandedItem}>
                                  <span className={styles.expandedLabel}><GraduationCap size={13} /> Enrollment No.</span>
                                  <span>{inq.enrollmentNumber}</span>
                                </div>
                              )}
                              {inq.projectDescription && (
                                <div className={styles.expandedItem}>
                                  <span className={styles.expandedLabel}><Briefcase size={13} /> Description</span>
                                  <span>{inq.projectDescription}</span>
                                </div>
                              )}
                              {inq.deadline && (
                                <div className={styles.expandedItem}>
                                  <span className={styles.expandedLabel}><Calendar size={13} /> Deadline</span>
                                  <span>{new Date(inq.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                </div>
                              )}
                              {inq.address && (
                                <div className={styles.expandedItem}>
                                  <span className={styles.expandedLabel}><MapPin size={13} /> Delivery Address</span>
                                  <span>{inq.address}</span>
                                </div>
                              )}
                              {inq.adminNote && (
                                <div className={styles.expandedItem}>
                                  <span className={styles.expandedLabel}><StickyNote size={13} /> Admin Note</span>
                                  <span>{inq.adminNote}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className={styles.pagination}>
          <button disabled={pagination.page <= 1} onClick={() => fetchInquiries(pagination.page - 1)}>Prev</button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button disabled={pagination.page >= pagination.pages} onClick={() => fetchInquiries(pagination.page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
