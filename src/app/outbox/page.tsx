'use client';

import { useEffect, useMemo, useState } from 'react';

type OutboxStatus = 'pending' | 'processing' | 'sent' | 'canceled';

type OutboxItem = {
  _id: string;
  type: string;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt?: string;
  createdAt?: string;
  updatedAt?: string;
  sentAt?: string | null;
  processingStartedAt?: string | null;
  lastError?: string | null;
  cancelReason?: string | null;
  to: string;
  signature: string;
  submissionId: string;
  studentId: string;
};

type OutboxResponse = {
  summary: Record<string, number>;
  items: OutboxItem[];
};

export default function OutboxPage() {
  const [statusFilter, setStatusFilter] = useState<OutboxStatus | 'all'>('pending');
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<OutboxResponse | null>(null);

  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string>('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    params.set('limit', String(limit));
    return params.toString();
  }, [statusFilter, limit]);

  const fetchOutbox = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/email/outbox?${queryString}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch outbox');
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch outbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const processNow = async () => {
    setProcessing(true);
    setProcessResult('');
    setError('');

    try {
      const res = await fetch('/api/email/outbox/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to process outbox');

      const s = json.summary;
      setProcessResult(
        `claimed=${s.claimed} sent=${s.sent} retried=${s.retried} canceled=${s.canceled}` +
          (s.error ? ` error=${s.error}` : '')
      );

      await fetchOutbox();
    } catch (e: any) {
      setError(e.message || 'Failed to process outbox');
    } finally {
      setProcessing(false);
    }
  };

  const summary = data?.summary || { pending: 0, processing: 0, sent: 0, canceled: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Outbox</h1>
          <p className="mt-1 text-gray-600">
            Grade emails are queued here and sent asynchronously.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={processNow}
            disabled={processing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {processing ? 'Processing…' : 'Process Now'}
          </button>
          <button
            onClick={fetchOutbox}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {processResult && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-900">
          {processResult}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-gray-900">{summary.pending || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Processing</div>
          <div className="text-2xl font-bold text-gray-900">{summary.processing || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Sent</div>
          <div className="text-2xl font-bold text-gray-900">{summary.sent || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Canceled</div>
          <div className="text-2xl font-bold text-gray-900">{summary.canceled || 0}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-3 md:items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="mt-1 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="pending">pending</option>
            <option value="processing">processing</option>
            <option value="sent">sent</option>
            <option value="canceled">canceled</option>
            <option value="all">all</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600">Limit</label>
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 50))}
            className="mt-1 w-28 px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="text-xs text-gray-500 md:ml-auto">
          Tip: In Vercel, configure a cron job to call the processor endpoint periodically.
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Attempt</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No outbox items found.
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.to}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'canceled'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.attempts}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.nextAttemptAt ? new Date(item.nextAttemptAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xl truncate" title={item.lastError || ''}>
                    {item.lastError || item.cancelReason || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
