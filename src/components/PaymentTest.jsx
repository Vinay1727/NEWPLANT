import React from "react";
import { generateInvoicePDF } from '../utils/invoiceUtils';

const API_BASE = "https://newplant-9.onrender.com";

const PaymentTest = ({ orderId, setCurrentPage, onPaymentSuccess }) => {
  const [order, setOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [method, setMethod] = React.useState('card');
  const [paidOrder, setPaidOrder] = React.useState(null);

  React.useEffect(() => {
    if (!orderId) return setLoading(false);
    const token = localStorage.getItem('auth_token');
    fetch(`${API_BASE}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.success) setOrder(d.order);
        else console.error('Failed to load order', d);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (!orderId) return (
    <div className="p-8 text-center">
      <p className="text-lg">No order selected for payment.</p>
      <div className="mt-4">
        <button onClick={() => setCurrentPage?.('home')} className="px-4 py-2 bg-green-600 rounded">Go Home</button>
      </div>
      {paidOrder && (
        <div className="max-w-3xl mx-auto mt-6">
          <div className="bg-green-900/10 p-4 rounded border border-green-700 flex items-center justify-between">
            <div>
              <div className="text-green-300 font-bold">Payment Confirmed</div>
              <div className="text-sm text-gray-400">Order ID: {paidOrder._id}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => generateInvoicePDF(paidOrder)} className="px-3 py-2 bg-green-600 rounded text-white">⬇️ Download Invoice</button>
              <button onClick={() => { setCurrentPage?.('home'); }} className="px-3 py-2 border border-green-700 rounded text-white">Finish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="p-8">Loading order...</div>;

  return (
    <div className="w-full max-w-3xl mx-auto p-8">
      <div className="bg-[#07110a] p-6 rounded-lg border border-green-700">
        <h2 className="text-2xl font-bold text-green-300 mb-4">Test Checkout (Card / UPI / Netbanking)</h2>
        <p className="text-gray-300 mb-2">Order ID: <strong className="text-green-400">{orderId}</strong></p>
        <div className="bg-green-900/10 p-4 rounded mb-4">
          {order?.items?.map((it) => (
            <div key={it.productId} className="flex justify-between py-2 border-b border-green-800/30">
              <div>
                <div className="text-lg font-bold">{it.name}</div>
                <div className="text-sm text-gray-400">Qty: {it.quantity}</div>
              </div>
              <div className="text-green-300">₹{Number(it.price).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-gray-300 mb-6">
          <div>Subtotal</div>
          <div className="text-green-300">₹{Number(order.subtotal).toFixed(2)}</div>
        </div>
        <div className="flex justify-between text-gray-300 mb-6">
          <div>Tax</div>
          <div className="text-green-300">₹{Number(order.tax).toFixed(2)}</div>
        </div>
        <div className="flex justify-between text-white font-bold mb-6">
          <div>Total</div>
          <div className="text-green-200">₹{Number(order.total).toFixed(2)}</div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Choose payment method</div>
          <div className="flex gap-2 mb-3">
            {['card', 'upi', 'netbanking'].map(m => (
              <button key={m} onClick={() => setMethod(m)} className={`px-3 py-2 rounded ${method === m ? 'bg-green-700' : 'bg-transparent border border-green-700'}`}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={async () => {
                if (!orderId) return;
                setProcessing(true);
                try {
                  const ok = confirm(`Simulate ${method.toUpperCase()} payment for order ${orderId}?`);
                  if (!ok) return;
                  const token = localStorage.getItem('auth_token');
                  const confirmResp = await fetch(`${API_BASE}/api/orders/${orderId}/confirm-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  });
                  const confirmData = await confirmResp.json();
                  if (!confirmData.success) {
                    alert(confirmData.message || 'Payment confirmation failed');
                    return;
                  }
                  // show invoice/download option before leaving
                  setPaidOrder(confirmData.order || { _id: confirmData.orderId || orderId });
                  onPaymentSuccess?.(confirmData.orderId || orderId);
                } catch (err) {
                  console.error('Mock payment error', err);
                  alert('Mock payment error');
                } finally {
                  setProcessing(false);
                }
              }}
              disabled={processing}
              className="px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded font-bold"
            >
              {processing ? 'Processing...' : `Pay with ${method.toUpperCase()}`}
            </button>

            <button onClick={() => setCurrentPage?.('cart')} className="px-4 py-3 border border-green-700 rounded">Back to Cart</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentTest;
