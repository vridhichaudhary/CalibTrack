'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { NotificationLog } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

const TRIGGER_LABELS: Record<string, string> = {
  '90_days': '90 Days Notice',
  '30_days': '30 Days Notice',
  '20_days': '20 Days Urgent',
};

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchData() {
    setIsLoading(true);
    try {
      const [logsRes, summaryRes] = await Promise.all([
        api.get('/notifications/logs/'),
        api.get('/notifications/logs/summary/'),
      ]);
      // API returns paginated format: { results: [...] } or wrapped: { data: [...] }
      setLogs(logsRes.data.results ?? logsRes.data.data ?? []);
      setSummary(summaryRes.data.data);
    } catch (err) {
      setMessage('Failed to load notification logs.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function triggerCheck() {
    setIsTriggering(true);
    setMessage('');
    try {
      await api.post('/notifications/trigger-check/');
      setMessage('Notification check triggered. Refreshing in a few seconds...');
      setTimeout(fetchData, 4000);
    } catch (err) {
      setMessage('Failed to trigger notification check.');
    } finally {
      setIsTriggering(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notification Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit trail of every calibration alert email sent.
          </p>
        </div>
        <Button onClick={triggerCheck} isLoading={isTriggering}>
          Run Check Now
        </Button>
      </div>

      {message && (
        <p className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
          {message}
        </p>
      )}

      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Sent (this year)</p>
            <p className="text-2xl font-semibold text-green-600">{summary.total_sent}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Failed (this year)</p>
            <p className="text-2xl font-semibold text-red-600">{summary.total_failed}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Total Recipients Reached</p>
            <p className="text-2xl font-semibold text-gray-900">{logs.length}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Instrument</th>
              <th className="px-4 py-3 text-left">Due Date</th>
              <th className="px-4 py-3 text-left">Trigger</th>
              <th className="px-4 py-3 text-left">Recipient</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Sent At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No notifications sent yet.
                </td>
              </tr>
            )}
            {!isLoading &&
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{log.instrument_name}</p>
                    <p className="text-xs text-gray-500">{log.instrument_serial_number}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(log.calibration_due_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {TRIGGER_LABELS[log.trigger_type] || log.trigger_type}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.recipient_email}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        log.status === 'SUCCESS'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {log.status}
                    </Badge>
                    {log.status === 'FAILED' && log.error_message && (
                      <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={log.error_message}>
                        {log.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(log.sent_at)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
