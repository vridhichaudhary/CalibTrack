'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { AlertRecipient } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<AlertRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    designation: '',
  });

  async function fetchRecipients() {
    setIsLoading(true);
    try {
      const response = await api.get('/notifications/recipients/');
      // API returns paginated format: { results: [...] } or wrapped: { data: [...] }
      const data = response.data.results ?? response.data.data ?? [];
      setRecipients(data);
    } catch (err) {
      setError('Failed to load recipients.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchRecipients();
  }, []);

  async function handleAddRecipient(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/notifications/recipients/', {
        ...formData,
        active: true,
      });
      setFormData({ name: '', email: '', designation: '' });
      setIsModalOpen(false);
      fetchRecipients();
    } catch (err: any) {
      const detail = err.response?.data?.error?.detail;
      setError(
        typeof detail === 'object'
          ? String(Object.values(detail)[0])
          : 'Failed to add recipient.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(recipient: AlertRecipient) {
    try {
      await api.patch(`/notifications/recipients/${recipient.id}/`, {
        active: !recipient.active,
      });
      fetchRecipients();
    } catch (err) {
      setError('Failed to update recipient.');
    }
  }

  async function deleteRecipient(id: string) {
    if (!confirm('Remove this recipient permanently?')) return;
    try {
      await api.delete(`/notifications/recipients/${id}/`);
      fetchRecipients();
    } catch (err) {
      setError('Failed to delete recipient.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Alert Recipients</h1>
          <p className="text-sm text-gray-500 mt-1">
            People who receive calibration due-date emails. Add or remove
            anyone here — no code changes needed.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Recipient
          </span>
        </Button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Designation</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Added</th>
              <th className="px-4 py-3 text-left">Actions</th>
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
            {!isLoading && recipients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No recipients added yet.
                </td>
              </tr>
            )}
            {!isLoading &&
              recipients.map((recipient) => (
                <tr key={recipient.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{recipient.name}</td>
                  <td className="px-4 py-3 text-gray-600">{recipient.email}</td>
                  <td className="px-4 py-3 text-gray-600">{recipient.designation || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(recipient)}>
                      <Badge
                        className={
                          recipient.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-500'
                        }
                      >
                        {recipient.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(recipient.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteRecipient(recipient.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Alert Recipient"
      >
        <form onSubmit={handleAddRecipient} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Designation"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            placeholder="e.g. Maintenance Engineer"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Add Recipient
          </Button>
        </form>
      </Modal>
    </div>
  );
}
