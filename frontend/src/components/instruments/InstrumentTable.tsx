'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpDown, FileText, MapPin } from 'lucide-react';
import { useInstruments } from '@/hooks/useInstruments';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { InstrumentDetailModal } from './InstrumentDetailModal';
import { formatDate, getAlertStatusStyles, classNames, debounce } from '@/lib/utils';
import { AlertStatus } from '@/types';

const ALERT_FILTERS: { value: AlertStatus | ''; label: string }[] = [
  { value: '', label: 'All instruments' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'critical', label: 'Critical (≤20 days)' },
  { value: 'warning', label: 'Due soon (≤30 days)' },
  { value: 'upcoming', label: 'Upcoming (≤90 days)' },
  { value: 'ok', label: 'OK' },
];

/**
 * Main instrument table for both the user dashboard and admin view.
 * Default sort is calibration_due_date ascending (handled via the
 * 'ordering' param sent to the backend) so instruments with the
 * soonest due dates appear first — exactly as required.
 * Rows are color-highlighted based on alert_status.
 */
export function InstrumentTable() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState('next_due_date');
  const [alertFilter, setAlertFilter] = useState<AlertStatus | ''>('');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { instruments, totalCount, totalPages, currentPage, isLoading, error, refetch } =
    useInstruments({
      page,
      pageSize: 20,
      search,
      ordering,
      alertStatus: alertFilter,
    });

  const debouncedSearch = debounce((value: string) => {
    setSearch(value);
    setPage(1);
  }, 400);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    debouncedSearch(value);
  }

  function toggleSort(field: string) {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else if (ordering === `-${field}`) {
      setOrdering(field);
    } else {
      setOrdering(field);
    }
    setPage(1);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this instrument?')) return;
    try {
      await api.delete(`/instruments/${id}/`);
      refetch();
    } catch (err) {
      alert('Failed to delete instrument. Please try again.');
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or serial number..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-400 rounded-md text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={alertFilter}
          onChange={(e) => {
            setAlertFilter(e.target.value as AlertStatus | '');
            setPage(1);
          }}
          className="border border-gray-300 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ALERT_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-900"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Instrument <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left">Serial Number</th>
              <th className="px-4 py-3 text-left">Calibrated On</th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-900"
                onClick={() => toggleSort('next_due_date')}
              >
                <div className="flex items-center gap-1">
                  Due Date <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Report</th>
              {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading instruments...
                </td>
              </tr>
            )}

            {!isLoading && instruments.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-400">
                  No instruments found.
                </td>
              </tr>
            )}

            {!isLoading &&
              instruments.map((instrument) => {
                const latest = instrument.latest_calibration;
                const status = latest?.alert_status || 'ok';
                const styles = getAlertStatusStyles(status);

                return (
                  <tr
                    key={instrument.id}
                    className={classNames(
                      'cursor-pointer transition-colors',
                      styles.row
                    )}
                    onClick={() => setSelectedInstrumentId(instrument.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {instrument.name}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {instrument.serial_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {latest ? formatDate(latest.calibrated_on) : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {latest ? formatDate(latest.calibration_due_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={styles.badge}>{styles.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {latest?.report_file_url ? (
                        <a
                          href={latest.report_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="h-4 w-4" /> View
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(instrument.id);
                          }}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition"
                          title="Delete instrument"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={20}
        onPageChange={setPage}
      />

      {selectedInstrumentId && (
        <InstrumentDetailModal
          instrumentId={selectedInstrumentId}
          isOpen={!!selectedInstrumentId}
          onClose={() => setSelectedInstrumentId(null)}
        />
      )}
    </div>
  );
}
