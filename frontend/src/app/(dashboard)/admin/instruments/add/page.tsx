import { InstrumentForm } from '@/components/instruments/InstrumentForm';

export default function AddInstrumentPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Add Instrument</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a new instrument and record its initial calibration.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <InstrumentForm />
      </div>
    </div>
  );
}
