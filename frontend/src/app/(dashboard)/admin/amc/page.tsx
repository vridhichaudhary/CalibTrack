'use client';

import { InstrumentTable } from '@/components/instruments/InstrumentTable';

export default function AdminAMCPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">AMC</h1>
        <p className="text-sm text-gray-500 mt-1">
          Annual Maintenance Contract — track and manage instrument maintenance schedules.
        </p>
      </div>
      <InstrumentTable type="amc" />
    </div>
  );
}
