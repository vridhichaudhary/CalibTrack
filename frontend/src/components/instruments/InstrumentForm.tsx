'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Two-step form: first creates the Instrument record, then
 * creates its first CalibrationRecord with the PDF report attached.
 * This matches the backend's separated Instrument/CalibrationRecord
 * design — instrument identity is permanent, calibration records
 * are added per cycle.
 */
export function InstrumentForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    serial_number: '',
    location: '',
    department: '',
    description: '',
    calibrated_on: '',
    calibration_due_date: '',
    notes: '',
  });
  const [reportFile, setReportFile] = useState<File | null>(null);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed for the calibration report.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size cannot exceed 10 MB.');
      return;
    }
    setError('');
    setReportFile(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.calibration_due_date <= formData.calibrated_on) {
      setError('Calibration due date must be after the calibrated on date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const instrumentResponse = await api.post('/instruments/', {
        name: formData.name,
        serial_number: formData.serial_number,
        location: formData.location,
        department: formData.department,
        description: formData.description,
        status: 'active',
      });

      const instrumentId = instrumentResponse.data.data.id;

      const calibrationFormData = new FormData();
      calibrationFormData.append('instrument', instrumentId);
      calibrationFormData.append('calibrated_on', formData.calibrated_on);
      calibrationFormData.append('calibration_due_date', formData.calibration_due_date);
      calibrationFormData.append('notes', formData.notes);
      if (reportFile) {
        calibrationFormData.append('report_file', reportFile);
      }

      await api.post('/instruments/calibrations/', calibrationFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      router.push('/admin/instruments');
    } catch (err: any) {
      const detail = err.response?.data?.error?.detail;
      if (detail && typeof detail === 'object') {
        const firstError = Object.values(detail)[0];
        setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        setError('Failed to create instrument. Please check all fields.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Instrument Name"
          required
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g. Pressure Gauge PG-001"
        />
        <Input
          label="Serial Number"
          required
          value={formData.serial_number}
          onChange={(e) => updateField('serial_number', e.target.value)}
          placeholder="e.g. PG-001-2024"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Location"
          required
          value={formData.location}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="e.g. Unit 3 - Control Room"
        />
        <Input
          label="Department"
          value={formData.department}
          onChange={(e) => updateField('department', e.target.value)}
          placeholder="e.g. Process Engineering"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Optional notes about this instrument"
        />
      </div>

      <hr className="border-gray-200" />

      <h3 className="text-sm font-semibold text-gray-900">Initial Calibration Record</h3>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Calibrated On"
          type="date"
          required
          value={formData.calibrated_on}
          onChange={(e) => updateField('calibrated_on', e.target.value)}
        />
        <Input
          label="Calibration Due Date"
          type="date"
          required
          value={formData.calibration_due_date}
          onChange={(e) => updateField('calibration_due_date', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Optional calibration notes"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Calibration Report (PDF)</label>
        <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-md px-4 py-6 cursor-pointer hover:bg-gray-50 justify-center text-sm text-gray-500">
          <Upload className="h-4 w-4" />
          {reportFile ? reportFile.name : 'Click to upload PDF (max 10MB)'}
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Create Instrument
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
