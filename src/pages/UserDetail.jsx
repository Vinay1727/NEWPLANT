import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = 'https://newplant-9.onrender.com';

export default function UserDetail() {
  const { userId } = useParams();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const resp = await fetch(`${API_BASE}/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await resp.json();
        if (data.success) setUser(data.user);
        else setError(data.message || 'User not found');
      } catch (e) {
        setError(e.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  if (loading) return <div className="p-6">Loading user...</div>;
  if (error) return <div className="p-6 text-red-400">{error}<div className="mt-4"><button className="px-3 py-2 bg-green-700 rounded" onClick={() => navigate(-1)}>Back</button></div></div>;
  if (!user) return <div className="p-6">No user data.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-green-300">User: {user.name}</h2>
        <button onClick={() => navigate(-1)} className="px-3 py-2 bg-green-700 rounded">Back</button>
      </div>

      <div className="bg-[#07110a] p-4 rounded border border-green-800">
        <div className="text-sm text-gray-400">Email</div>
        <div className="font-semibold text-white">{user.email}</div>
        <div className="mt-3 text-sm text-gray-400">Role</div>
        <div className="font-semibold text-white">{user.role}</div>

        <div className="mt-4 text-sm text-gray-400">Joined</div>
        <div className="font-semibold text-white">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</div>
      </div>
    </div>
  );
}
