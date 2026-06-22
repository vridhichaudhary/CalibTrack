'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { InstrumentTable } from '@/components/instruments/InstrumentTable';
import { Button } from '@/components/ui/Button';

export default function AdminInstrumentsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Instruments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage instruments and their calibration records.
          </p>
        </div>
        <Link href="/admin/instruments/add">
          <Button>
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Instrument
            </span>
          </Button>
        </Link>
      </div>

      <InstrumentTable />
    </div>
  );
}
