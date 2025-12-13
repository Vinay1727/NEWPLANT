import React from 'react';
import { formatINR } from '../utils/priceUtils';
import jsPDF from 'jspdf';

const API_BASE = 'https://newplant-9.onrender.com';

const MyOrders = ({ setCurrentPage }) => {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [reviewText, setReviewText] = React.useState('');
  const [submittingReview, setSubmittingReview] = React.useState(false);
  const [reviewedOrders, setReviewedOrders] = React.useState({});

  React.useEffect(() => {
    fetchMyOrders();
  }, []);

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please login to view orders');
        setCurrentPage?.('home');
        return;
      }

      // Fetch user's orders from the /api/my-orders endpoint
      const resp = await fetch(`${API_BASE}/api/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();

      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-900/30 border-yellow-700 text-yellow-300',
      'processing': 'bg-blue-900/30 border-blue-700 text-blue-300',
      'shipped': 'bg-purple-900/30 border-purple-700 text-purple-300',
      'delivered': 'bg-green-900/30 border-green-700 text-green-300',
      'paid': 'bg-green-900/30 border-green-700 text-green-300',
      'failed': 'bg-red-900/30 border-red-700 text-red-300'
    };
    return colors[status] || 'bg-gray-900/30 border-gray-700 text-gray-300';
  };

  const downloadInvoicePDF = (order) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Company Header
      doc.setFontSize(18);
      doc.setTextColor(255, 215, 0); // Golden
      doc.text('jeevaLeaf', margin, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setTextColor(76, 175, 80); // Green
      doc.text('Bring life in our home', margin, yPos);
      yPos += 6;

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Premium Plants & Garden Solutions', margin, yPos);
      yPos += 8;

      // Invoice Title
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('TAX INVOICE', pageWidth - margin - 40, margin + 5, { align: 'right' });

      // Invoice Details
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Invoice #${order._id.toString().slice(-10)}`, pageWidth - margin - 40, margin + 12, { align: 'right' });
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, pageWidth - margin - 40, margin + 17, { align: 'right' });
      doc.text(`Status: ${(order.status || 'Pending').toUpperCase()}`, pageWidth - margin - 40, margin + 22, { align: 'right' });

      yPos += 25;

      // Separator
      doc.setDrawColor(76, 175, 80);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      // Company Info
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('SOLD BY:', margin, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text('jeevaLeaf - Premium Plants Store', margin, yPos);
      yPos += 4;
      doc.text('Email: support@jeevaleaf.com', margin, yPos);
      yPos += 4;
      doc.text('Phone: +91-XXXXXXXXXX', margin, yPos);
      yPos += 4;
      doc.text('GSTIN: Pending Registration', margin, yPos);
      yPos += 8;

      // Bill To and Ship To (2 columns)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('BILL TO:', margin, yPos);

      doc.text('SHIP TO:', pageWidth / 2 + 5, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(order.deliveryName || 'Customer', margin, yPos);
      doc.text(order.deliveryName || 'Customer', pageWidth / 2 + 5, yPos);
      yPos += 4;

      if (order.deliveryEmail) {
        doc.text(order.deliveryEmail, margin, yPos);
        doc.text(order.deliveryEmail, pageWidth / 2 + 5, yPos);
        yPos += 4;
      }
      if (order.deliveryPhone) {
        doc.text(order.deliveryPhone, margin, yPos);
        doc.text(order.deliveryPhone, pageWidth / 2 + 5, yPos);
        yPos += 4;
      }
      if (order.deliveryAddress) {
        const addressLines = doc.splitTextToSize(order.deliveryAddress, 70);
        doc.text(addressLines, margin, yPos);
        doc.text(addressLines, pageWidth / 2 + 5, yPos);
        yPos += addressLines.length * 4 + 2;
      }
      yPos += 2;

      // Separator
      doc.setDrawColor(232, 232, 232);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      // Items Table Header
      doc.setFillColor(76, 175, 80);
      doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Item', margin + 2, yPos);
      doc.text('Description', margin + 15, yPos);
      doc.text('Qty', pageWidth - 70, yPos);
      doc.text('Price (₹)', pageWidth - 40, yPos, { align: 'right' });
      yPos += 8;

      // Items Table Body
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      order.items?.forEach((item, idx) => {
        const itemTotal = (Number(item.price) || 0) * (item.quantity || 1);
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.text((idx + 1).toString(), margin + 2, yPos);
        const itemName = doc.splitTextToSize(item.name, 50);
        doc.text(itemName, margin + 15, yPos);
        doc.text(item.quantity.toString(), pageWidth - 70, yPos);
        doc.text(`₹${(Number(item.price) || 0).toFixed(2)}`, pageWidth - 40, yPos, { align: 'right' });
        yPos += 6;
      });
      yPos += 4;

      // Separator
      doc.setDrawColor(232, 232, 232);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      // Summary
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Subtotal:', pageWidth - 60, yPos);
      doc.text(`₹${(order.subtotal || 0).toFixed(2)}`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 5;

      doc.text('Tax (10%):', pageWidth - 60, yPos);
      doc.text(`₹${(order.tax || 0).toFixed(2)}`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 5;

      doc.text('Shipping:', pageWidth - 60, yPos);
      doc.text(`₹${(order.shipping || 0).toFixed(2)}`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 8;

      // Total Line
      doc.setDrawColor(76, 175, 80);
      doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos);
      yPos += 6;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(76, 175, 80);
      doc.text('GRAND TOTAL', pageWidth - 60, yPos);
      doc.setTextColor(255, 215, 0);
      doc.text(`₹${(order.total || 0).toFixed(2)}`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 12;

      // Payment Details
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Payment Method: ${order.paymentMethod || 'Online'}`, margin, yPos);
      yPos += 4;
      doc.text(`Payment Status: ${order.paymentStatus || 'Pending'}`, margin, yPos);
      yPos += 10;

      // Footer
      doc.setTextColor(150, 150, 150);
      doc.text('Thank you for your order! We appreciate your business.', pageWidth / 2, yPos, { align: 'center', maxWidth: pageWidth - 2 * margin });
      yPos += 6;

      doc.setFontSize(6);
      doc.text('For support: support@jeevaleaf.com | www.jeevaleaf.com', pageWidth / 2, yPos, { align: 'center', maxWidth: pageWidth - 2 * margin });

      // Save PDF
      doc.save(`invoice-${order._id}.pdf`);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('Failed to download invoice');
    }
  };

  const submitReview = async (order) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return alert('Please login to submit a review');
      if (!order || !order._id) return;
      setSubmittingReview(true);
      const resp = await fetch(`${API_BASE}/api/orders/${order._id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, text: reviewText })
      });
      const data = await resp.json();
      if (data.success) {
        setReviewedOrders((s) => ({ ...s, [order._id]: true }));
        setReviewOpen(false);
        setReviewText('');
        setRating(5);
        alert('Thanks! Your review has been submitted.');
      } else {
        alert(data.message || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Review submission failed', err);
      alert('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1a12] to-[#051108] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-green-300">📦 Your Orders</h1>
          <button
            onClick={() => setCurrentPage?.('home')}
            className="px-4 py-2 bg-green-700 rounded hover:bg-green-600 text-white"
          >
            ← Back
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[#07110a] p-8 rounded-lg border border-green-700 text-center">
            <p className="text-2xl mb-4">📭</p>
            <p className="text-gray-300 text-lg">No orders found</p>
            <button
              onClick={() => setCurrentPage?.('home')}
              className="mt-4 px-4 py-2 bg-green-600 rounded text-white hover:bg-green-500"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Orders List */}
            <div className="lg:col-span-2">
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 rounded-lg border cursor-pointer transition ${selectedOrder?._id === order._id
                      ? 'bg-green-900/20 border-green-600'
                      : 'bg-[#07110a] border-green-800 hover:border-green-600'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-green-300">Order #{order._id?.slice(-8)}</div>
                        <div className="text-xs text-gray-400">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-400">₹{Number(order.total || 0).toFixed(2)}</div>
                        <div className="text-xs text-gray-400">{order.items?.length || 0} items</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(order.status || 'pending')}`}>
                        {order.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Detail */}
            {selectedOrder && (
              <div className="bg-[#07110a] p-6 rounded-lg border border-green-700">
                <h3 className="text-xl font-bold text-green-300 mb-4">Order Details</h3>

                <div className="space-y-4 mb-4 pb-4 border-b border-green-800">
                  <div>
                    <div className="text-sm text-gray-400">Delivery To</div>
                    <div className="font-semibold text-white">{selectedOrder.deliveryName || '—'}</div>
                    <div className="text-sm text-gray-400">{selectedOrder.deliveryPhone || '—'}</div>
                    <div className="text-sm text-gray-400">{selectedOrder.deliveryEmail || '—'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400">Address</div>
                    <div className="text-sm text-white whitespace-pre-wrap break-words">{selectedOrder.deliveryAddress || '—'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400">Location</div>
                    <div className="font-semibold text-white">{selectedOrder.deliveryLocation || '—'}</div>
                  </div>
                </div>

                <h4 className="font-bold text-green-300 mb-2">Items</h4>
                <div className="space-y-2 mb-4 pb-4 border-b border-green-800">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <span className="text-green-400">₹{Number(item.price || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Subtotal</span>
                    <span>₹{Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Tax</span>
                    <span>₹{Number(selectedOrder.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Shipping</span>
                    <span>₹{Number(selectedOrder.shipping || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-green-300 pt-2 border-t border-green-800">
                    <span>Total</span>
                    <span>₹{Number(selectedOrder.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Payment</span>
                    <span className="font-semibold uppercase">{selectedOrder.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Status</span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedOrder.status || 'pending')}`}>
                      {selectedOrder.status || 'pending'}
                    </span>
                  </div>
                </div>

                {/* Review section: allow submitting a review only when order is delivered */}
                {String(selectedOrder.status || '').toLowerCase() === 'delivered' && (
                  <div className="mt-4">
                    {!reviewedOrders[selectedOrder._id] ? (
                      <div>
                        {!reviewOpen ? (
                          <button onClick={() => setReviewOpen(true)} className="w-full mb-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black rounded font-semibold transition">✍️ Write a Review</button>
                        ) : (
                          <div className="bg-[#06110a] p-4 rounded border border-green-800">
                            <label className="block text-sm text-gray-300 mb-2">Rating</label>
                            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full mb-3 p-2 rounded bg-black text-white border border-green-800">
                              <option value={5}>5 - Excellent</option>
                              <option value={4}>4 - Very Good</option>
                              <option value={3}>3 - Good</option>
                              <option value={2}>2 - Fair</option>
                              <option value={1}>1 - Poor</option>
                            </select>
                            <label className="block text-sm text-gray-300 mb-2">Review</label>
                            <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} className="w-full p-2 mb-3 rounded bg-black text-white border border-green-800" placeholder="Tell us about your experience"></textarea>
                            <div className="flex gap-2">
                              <button disabled={submittingReview} onClick={() => submitReview(selectedOrder)} className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded font-semibold">{submittingReview ? 'Submitting…' : 'Submit Review'}</button>
                              <button disabled={submittingReview} onClick={() => { setReviewOpen(false); setReviewText(''); setRating(5); }} className="px-4 py-2 bg-transparent border border-green-700 text-green-300 rounded">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded bg-green-900/20 border border-green-700 text-sm text-green-200">✅ Thank you — your review for this order has been submitted.</div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => downloadInvoicePDF(selectedOrder)}
                  className="w-full mt-6 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded font-semibold transition flex items-center justify-center gap-2"
                >
                  📥 Download Invoice
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
