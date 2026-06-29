'use client';

import { useState, useEffect } from 'react';
import { FileText, MapPin } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatDate, getAlertStatusStyles } from '@/lib/utils';
import api from '@/lib/api';
import { Instrument } from '@/types';

interface InstrumentDetailModalProps {
  instrumentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InstrumentDetailModal({ instrumentId, isOpen, onClose }: InstrumentDetailModalProps) {
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !instrumentId) return;

    let mounted = true;
    setIsLoading(true);
    api
      .get(`/instruments/${instrumentId}/`)
      .then((res) => {
        if (mounted) setInstrument(res.data.data);
      })
      .catch((err) => {
        if (mounted) setError('Failed to load instrument details.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [instrumentId, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Instrument Details">
      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading details...</div>
      ) : error ? (
        <div className="py-8 text-center text-red-500">{error}</div>
      ) : instrument ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Name</p>
              <p className="font-medium text-gray-900">{instrument.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Serial Number</p>
              <p className="font-medium text-gray-900">{instrument.serial_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Department</p>
              <p className="font-medium text-gray-900">{instrument.department || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
              <Badge className="mt-1 capitalize">
                {instrument.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Calibration History</h3>
            {instrument.calibration_records && instrument.calibration_records.length > 0 ? (
              <div className="space-y-3">
                {instrument.calibration_records.map((record: any) => {
                  const styles = getAlertStatusStyles(record.alert_status);
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          Due: {formatDate(record.calibration_due_date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Calibrated on: {formatDate(record.calibrated_on)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={styles.badge}>{styles.label}</Badge>
                        {record.report_file_url ? (
                          <a
                            href={record.report_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                          >
                            <FileText className="h-4 w-4" /> View
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No calibration records found.</p>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
