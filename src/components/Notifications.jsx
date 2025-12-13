import React, { useState, useEffect } from "react";

const API_BASE = "https://newplant-9.onrender.com";

const Notifications = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const resp = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="absolute top-16 right-0 w-80 md:w-96 bg-[#071018] border-2 border-green-700 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
      <div className="p-4 border-b border-green-800 bg-green-900/30 flex justify-between items-center">
        <h3 className="text-white font-bold text-lg">🔔 Notifications</h3>
        <div className="flex gap-2">
          <button onClick={markAllRead} className="text-xs text-green-400 hover:text-green-300 underline">
            Mark all read
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-2">
        {loading ? (
          <div className="text-center p-4 text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-8 text-gray-500 flex flex-col items-center">
            <span className="text-3xl mb-2">📭</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              className={`p-3 rounded-lg border transition hover:bg-green-900/10 ${n.read ? 'border-gray-800 bg-transparent opacity-75' : 'border-green-600 bg-green-900/20'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className={`font-semibold text-sm ${n.type === 'error' ? 'text-red-400' : n.type === 'success' ? 'text-green-400' : 'text-blue-400'}`}>
                  {n.title}
                </h4>
                {!n.read && (
                  <button onClick={(e) => markAsRead(n._id, e)} className="text-[10px] bg-green-600 px-2 py-0.5 rounded-full text-white hover:bg-green-500">
                    New
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm leading-snug">{n.message}</p>
              <p className="text-xs text-gray-500 mt-2 text-right">
                {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
