'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, X, Pencil, Check, Plus, Upload, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatDate, getAlertStatusStyles } from '@/lib/utils';
import api from '@/lib/api';
import { Instrument, CalibrationRecord, AMCRecord } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  instrumentId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  type?: 'calibration' | 'amc' | 'camc';
}

const INSTRUMENT_NAMES = [
  'Shimadzu GC-01 UOP 744',
  'Shimadzu GC-02 UOP 744',
  'SHIMADZU GC-03 UOP 744 & ASTM D7504',
  'Shimadzu GC-04 ASTM D7504',
  'Shimadzu GC SCD',
  'Shimadzu HPLC ASTM D7884',
  'Agilent HPLC ASTM D7884',
  'Agilent GC-01 UOP 621',
  'Agilent GC-02 UOP 690',
  'Agilent GC-03 UOP 720',
  'Agilent GC-04 UOP 798',
  'Agilent GC-05 UOP 744',
  'Agilent GC-06 UOP 744',
  'Agilent GC-07 UOP 831',
  'Agilent GC-08 ASTM D-6730 DHA PIONA',
  'Agilent GC-09 UOP 931',
  'Agilent GC-10',
  'Agilent GC-11 ASTM D-6730 DHA PIONA',
  'Agilent GC-12 UOP 744',
  'Agilent GC-13 INVISTA 1020',
  'Agilent GC-14 INVISTA 1020',
  'Agilent GC-15 INVISTA 1990',
  'Agilent GC-16 INVISTA 2210',
];

const INSTRUMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

export function InstrumentDetailModal({ instrumentId, isOpen, onClose, onUpdated, type = 'calibration' }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit instrument info
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ name: '', department: '', status: 'active' });
  const [useCustomName, setUseCustomName] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');

  // Edit calibration record
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState({ calibrated_on: '', maintenance_on: '', calibration_due_date: '', due_date: '', notes: '' });
  const [recordFile, setRecordFile] = useState<File | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordError, setRecordError] = useState('');
  const recordFileRef = useRef<HTMLInputElement>(null);

  // Add new calibration record
  const [addingRecord, setAddingRecord] = useState(false);
  const [newRecordForm, setNewRecordForm] = useState({ calibrated_on: '', maintenance_on: '', calibration_due_date: '', due_date: '', notes: '' });
  const [newRecordFile, setNewRecordFile] = useState<File | null>(null);
  const [savingNewRecord, setSavingNewRecord] = useState(false);
  const [newRecordError, setNewRecordError] = useState('');
  const newFileRef = useRef<HTMLInputElement>(null);

  function fetchInstrument() {
    if (!isOpen || !instrumentId) return;
    setIsLoading(true);
    api
      .get(`/instruments/${instrumentId}/`)
      .then((res) => {
        const inst = res.data.data;
        setInstrument(inst);
        setInfoForm({ name: inst.name, department: inst.department || 'PX-PTA Lab', status: inst.status });
        setUseCustomName(!INSTRUMENT_NAMES.includes(inst.name));
      })
      .catch(() => setError('Failed to load instrument details.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { fetchInstrument(); }, [instrumentId, isOpen]);

  /* ── Save instrument info ── */
  async function saveInfo() {
    setSavingInfo(true);
    setInfoError('');
    try {
      await api.patch(`/instruments/${instrumentId}/`, infoForm);
      setEditingInfo(false);
      fetchInstrument();
      onUpdated?.();
    } catch (e: any) {
      setInfoError(e.response?.data?.error?.detail || 'Failed to save changes.');
    } finally {
      setSavingInfo(false);
    }
  }

  /* ── Start editing a calibration record ── */
  function startEditRecord(record: CalibrationRecord | AMCRecord) {
    setEditingRecordId(record.id);
    setRecordForm({
      calibrated_on: ('calibrated_on' in record) ? record.calibrated_on : '',
      maintenance_on: ('maintenance_on' in record) ? record.maintenance_on : '',
      calibration_due_date: ('calibration_due_date' in record) ? record.calibration_due_date : '',
      due_date: ('due_date' in record) ? record.due_date : '',
      notes: record.notes || '',
    });
    setRecordFile(null);
    setRecordError('');
  }

  /* ── Save calibration record edits ── */
  async function saveRecord() {
    if (!editingRecordId) return;
    setSavingRecord(true);
    setRecordError('');
    try {
      const fd = new FormData();
      if (type === 'calibration') {
        fd.append('calibrated_on', recordForm.calibrated_on);
        fd.append('calibration_due_date', recordForm.calibration_due_date);
        if (recordFile) fd.append('report_file', recordFile);
      } else {
        fd.append('maintenance_on', recordForm.maintenance_on);
        fd.append('due_date', recordForm.due_date);
      }
      fd.append('notes', recordForm.notes);

      await api.patch(`/instruments/${type === 'calibration' ? 'calibrations' : type}/${editingRecordId}/`, fd);
      setEditingRecordId(null);
      fetchInstrument();
      onUpdated?.();
    } catch (e: any) {
      const detail = e.response?.data?.error?.detail;
      setRecordError(typeof detail === 'string' ? detail : 'Failed to save calibration record.');
    } finally {
      setSavingRecord(false);
    }
  }

  /* ── Add new calibration record ── */
  async function addRecord() {
    setSavingNewRecord(true);
    setNewRecordError('');
    try {
      const fd = new FormData();
      fd.append('instrument', instrumentId);
      if (type === 'calibration') {
        fd.append('calibrated_on', newRecordForm.calibrated_on);
        fd.append('calibration_due_date', newRecordForm.calibration_due_date);
        if (newRecordFile) fd.append('report_file', newRecordFile);
      } else {
        fd.append('maintenance_on', newRecordForm.maintenance_on);
        fd.append('due_date', newRecordForm.due_date);
      }
      fd.append('notes', newRecordForm.notes);

      await api.post(`/instruments/${type === 'calibration' ? 'calibrations' : type}/`, fd);
      setAddingRecord(false);
      setNewRecordForm({ calibrated_on: '', maintenance_on: '', calibration_due_date: '', due_date: '', notes: '' });
      setNewRecordFile(null);
      fetchInstrument();
      onUpdated?.();
    } catch (e: any) {
      const detail = e.response?.data?.error?.detail;
      setNewRecordError(
        typeof detail === 'object' && detail
          ? Object.values(detail).flat().join(' ')
          : typeof detail === 'string'
          ? detail
          : 'Failed to add calibration record.'
      );
    } finally {
      setSavingNewRecord(false);
    }
  }

  /* ── Delete calibration record ── */
  async function deleteRecord(id: string) {
    if (!confirm('Delete this calibration record?')) return;
    try {
      await api.delete(`/instruments/calibrations/${id}/`);
      fetchInstrument();
      onUpdated?.();
    } catch {
      alert('Failed to delete record.');
    }
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Instrument Details" wide>
      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : error ? (
        <div className="py-12 text-center text-red-500">{error}</div>
      ) : instrument ? (
        <div className="space-y-6">

          {/* ── Instrument Info Section ── */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Instrument Information</h3>
              {isAdmin && !editingInfo && (
                <button
                  onClick={() => setEditingInfo(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>

            {editingInfo ? (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Instrument Name</label>
                  {useCustomName ? (
                    <div className="flex gap-2">
                      <input
                        className={inputCls + ' flex-1'}
                        value={infoForm.name}
                        onChange={(e) => setInfoForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Enter instrument name"
                      />
                      <button
                        type="button"
                        onClick={() => { setUseCustomName(false); setInfoForm((p) => ({ ...p, name: INSTRUMENT_NAMES[0] })); }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 border border-gray-300 rounded-lg"
                      >
                        Use list
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        className={inputCls + ' flex-1'}
                        value={infoForm.name}
                        onChange={(e) => setInfoForm((p) => ({ ...p, name: e.target.value }))}
                      >
                        {INSTRUMENT_NAMES.map((n) => <option key={n}>{n}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => { setUseCustomName(true); setInfoForm((p) => ({ ...p, name: '' })); }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 border border-gray-300 rounded-lg whitespace-nowrap"
                      >
                        Custom
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Department</label>
                    <select
                      className={inputCls}
                      value={infoForm.department}
                      onChange={(e) => setInfoForm((p) => ({ ...p, department: e.target.value }))}
                    >
                      <option>PX-PTA Lab</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      className={inputCls}
                      value={infoForm.status}
                      onChange={(e) => setInfoForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      {INSTRUMENT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {infoError && <p className="text-sm text-red-600">{infoError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={saveInfo}
                    disabled={savingInfo}
                    className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    <Check className="h-4 w-4" /> {savingInfo ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingInfo(false); setInfoError(''); }}
                    className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                {[
                  { label: 'Name', value: instrument.name },
                  { label: 'Serial Number', value: instrument.serial_number },
                  { label: 'Department', value: instrument.department || '—' },
                  {
                    label: 'Status',
                    value: (
                      <Badge className={
                        instrument.status === 'active' ? 'bg-green-100 text-green-800' :
                        instrument.status === 'under_maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {instrument.status.replace(/_/g, ' ')}
                      </Badge>
                    ),
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                    <div className="text-sm font-medium text-gray-900">{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── {type === 'calibration' ? 'Calibration History' : type === 'amc' ? 'AMC History' : 'CAMC History'} ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Calibration Records</h3>
              {isAdmin && !addingRecord && (
                <button
                  onClick={() => setAddingRecord(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Record
                </button>
              )}
            </div>

            {/* Add new record form */}
            {addingRecord && (
              <div className="mb-4 p-4 rounded-xl border-2 border-green-200 bg-green-50 space-y-3">
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wider">New Calibration Record</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{type === 'calibration' ? 'Calibrated' : 'Maintained'} On *</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={type === 'calibration' ? newRecordForm.calibrated_on : newRecordForm.maintenance_on}
                      onChange={(e) => setNewRecordForm((p) => type === 'calibration' ? { ...p, calibrated_on: e.target.value } : { ...p, maintenance_on: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Due Date *</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={type === 'calibration' ? newRecordForm.calibration_due_date : newRecordForm.due_date}
                      onChange={(e) => setNewRecordForm((p) => type === 'calibration' ? { ...p, calibration_due_date: e.target.value } : { ...p, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Optional notes"
                    value={newRecordForm.notes}
                    onChange={(e) => setNewRecordForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Calibration Report (PDF, Excel, Word, etc.)</label>
                  <button
                    type="button"
                    onClick={() => newFileRef.current?.click()}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-white transition"
                  >
                    <Upload className="h-4 w-4" />
                    {newRecordFile ? newRecordFile.name : 'Choose file…'}
                  </button>
                  <input
                    ref={newFileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.txt,.jpg,.png"
                    onChange={(e) => setNewRecordFile(e.target.files?.[0] || null)}
                  />
                </div>
                {newRecordError && <p className="text-sm text-red-600">{newRecordError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={addRecord}
                    disabled={
                      savingNewRecord ||
                      (type === 'calibration' ? (!newRecordForm.calibrated_on || !newRecordForm.calibration_due_date) : (!newRecordForm.maintenance_on || !newRecordForm.due_date))
                    }
                    className="inline-flex items-center gap-1.5 bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    <Check className="h-4 w-4" /> {savingNewRecord ? 'Saving…' : 'Save Record'}
                  </button>
                  <button
                    onClick={() => { setAddingRecord(false); setNewRecordError(''); }}
                    className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Existing records list */}
            {(type === 'calibration' ? instrument.calibration_records : type === 'amc' ? instrument.amc_records : instrument.camc_records) && (type === 'calibration' ? instrument.calibration_records : type === 'amc' ? instrument.amc_records : instrument.camc_records).length > 0 ? (
              <div className="space-y-3">
                {(type === 'calibration' ? instrument.calibration_records : type === 'amc' ? instrument.amc_records : instrument.camc_records).map((record) => {
                  const styles = getAlertStatusStyles(record.alert_status);
                  const isEditingThis = editingRecordId === record.id;

                  return (
                    <div
                      key={record.id}
                      className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                    >
                      {isEditingThis ? (
                        <div className="p-4 space-y-3">
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Editing Record</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>{type === 'calibration' ? 'Calibrated' : 'Maintained'} On</label>
                              <input
                                type="date"
                                className={inputCls}
                                value={type === 'calibration' ? recordForm.calibrated_on : recordForm.maintenance_on}
                                onChange={(e) => setRecordForm((p) => type === 'calibration' ? { ...p, calibrated_on: e.target.value } : { ...p, maintenance_on: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Due Date</label>
                              <input
                                type="date"
                                className={inputCls}
                                value={type === 'calibration' ? recordForm.calibration_due_date : recordForm.due_date}
                                onChange={(e) => setRecordForm((p) => type === 'calibration' ? { ...p, calibration_due_date: e.target.value } : { ...p, due_date: e.target.value })}
                              />
                            </div>
                          </div>
                          <div>
                            <label className={labelCls}>Notes</label>
                            <input
                              type="text"
                              className={inputCls}
                              value={recordForm.notes}
                              onChange={(e) => setRecordForm((p) => ({ ...p, notes: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Replace Report (leave empty to keep existing)</label>
                            <button
                              type="button"
                              onClick={() => recordFileRef.current?.click()}
                              className="inline-flex items-center gap-2 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
                            >
                              <Upload className="h-4 w-4" />
                              {recordFile ? recordFile.name : 'Choose file…'}
                            </button>
                            <input
                              ref={recordFileRef}
                              type="file"
                              className="hidden"
                              accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.txt,.jpg,.png"
                              onChange={(e) => setRecordFile(e.target.files?.[0] || null)}
                            />
                            {type === 'calibration' && (record as any).report_file_url && !recordFile && (
                              <a
                                href={(record as any).report_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-3 text-sm text-blue-600 hover:underline"
                              >
                                View current
                              </a>
                            )}
                          </div>
                          {recordError && <p className="text-sm text-red-600">{recordError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={saveRecord}
                              disabled={savingRecord}
                              className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                              <Check className="h-4 w-4" /> {savingRecord ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setEditingRecordId(null); setRecordError(''); }}
                              className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-gray-900">
                                Due: {formatDate(('calibration_due_date' in record) ? (record as CalibrationRecord).calibration_due_date : (record as AMCRecord).due_date)}
                              </span>
                              <Badge className={styles.badge}>{styles.label}</Badge>
                            </div>
                            <div className="text-xs text-gray-500">
                              {type === 'calibration' ? 'Calibrated' : 'Maintained'} on: {formatDate(('calibrated_on' in record) ? (record as CalibrationRecord).calibrated_on : (record as AMCRecord).maintenance_on)}
                              {record.notes && <span className="ml-3 text-gray-400">· {record.notes}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            {type === 'calibration' && (record as any).report_file_url ? (
                              <a
                                href={(record as any).report_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                <FileText className="h-4 w-4" /> Report
                              </a>
                            ) : type !== 'calibration' ? null : (
                              <span className="text-sm text-gray-400">No report</span>
                            )}
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEditRecord(record)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Edit record"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteRecord(record.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete record"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm">No calibration records yet.</p>
                {isAdmin && (
                  <p className="text-xs mt-1">Click <strong>Add Record</strong> to create one.</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
