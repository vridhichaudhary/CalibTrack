'use client';

import { useAuth } from '@/hooks/useAuth';
import { InstrumentTable } from '@/components/instruments/InstrumentTable';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Instrument Calibration Status
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome{user ? `, ${user.full_name || user.username}` : ''}. 
          Instruments are sorted by upcoming calibration due date.
        </p>
      </div>

      <InstrumentTable />
    </div>
  );
}
