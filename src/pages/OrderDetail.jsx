import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = 'https://newplant-9.onrender.com';

export default function OrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const resp = await fetch(`${API_BASE}/api/admin/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await resp.json();
        if (data.success) setOrder(data.order);
        else setError(data.message || 'Order not found');
      } catch (e) {
        setError(e.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) return <div className="p-6">Loading order...</div>;
  if (error) return <div className="p-6 text-red-400">{error}<div className="mt-4"><button className="px-3 py-2 bg-green-700 rounded" onClick={() => navigate(-1)}>Back</button></div></div>;
  if (!order) return <div className="p-6">No order data.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-green-300">Order {order._id}</h2>
        <button onClick={() => navigate(-1)} className="px-3 py-2 bg-green-700 rounded">Back</button>
      </div>

      <div className="bg-[#07110a] p-4 rounded border border-green-800">
        <div className="text-sm text-gray-400">Customer</div>
        <div className="font-semibold text-white">{(order.user && order.user.name) || '—'}</div>
        <div className="text-xs text-gray-400 mb-4">{(order.user && order.user.email) || '—'}</div>

        <div className="text-sm text-gray-400">Items</div>
        <div className="mt-2 space-y-2">
          {order.items?.map(it => (
            <div key={it.productId} className="flex justify-between bg-green-900/10 p-2 rounded border border-green-800/30">
              <div>
                <div className="font-semibold">{it.name}</div>
                <div className="text-xs text-gray-400">Qty: {it.quantity}</div>
              </div>
              <div className="font-semibold">₹{Number(it.price || 0).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">Subtotal</div>
            <div className="font-bold text-green-300">₹{Number(order.subtotal || 0).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Total</div>
            <div className="font-bold text-green-300">₹{Number(order.total || 0).toFixed(2)}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
