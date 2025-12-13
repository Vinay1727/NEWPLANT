import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = 'https://newplant-9.onrender.com';

export default function MessageDetail() {
  const { messageId } = useParams();
  const [message, setMessage] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchMessage = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const resp = await fetch(`${API_BASE}/api/admin/messages/${messageId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await resp.json();
        if (data.success) setMessage(data.message);
        else setError(data.message || 'Message not found');
      } catch (e) {
        setError(e.message || 'Failed to load message');
      } finally {
        setLoading(false);
      }
    };
    fetchMessage();
  }, [messageId]);

  if (loading) return <div className="p-6">Loading message...</div>;
  if (error) return <div className="p-6 text-red-400">{error}<div className="mt-4"><button className="px-3 py-2 bg-green-700 rounded" onClick={() => navigate(-1)}>Back</button></div></div>;
  if (!message) return <div className="p-6">No message data.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-green-300">Message from {message.name}</h2>
        <button onClick={() => navigate(-1)} className="px-3 py-2 bg-green-700 rounded">Back</button>
      </div>

      <div className="bg-[#07110a] p-4 rounded border border-green-800">
        <div className="text-sm text-gray-400">Contact</div>
        <div className="font-semibold text-white">{message.email || message.phone || '—'}</div>
        <div className="mt-4 text-sm text-gray-400">Received</div>
        <div className="font-semibold text-white">{new Date(message.createdAt).toLocaleString()}</div>

        <div className="mt-4 text-sm text-gray-400">Message</div>
        <div className="mt-2 whitespace-pre-wrap text-white bg-green-900/10 p-3 rounded border border-green-800/30">{message.message}</div>
      </div>
    </div>
  );
}
