import React from 'react';
import { toINR, formatINR } from '../utils/priceUtils';
import { generateInvoicePDF } from '../utils/invoiceUtils';

const API_BASE = 'https://newplant-9.onrender.com';

const Checkout = ({ cartItems = [], setCurrentPage, setPaymentOrderId, removeItem }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    location: ''
  });
  const [loading, setLoading] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState('cod');
  const [confirmedOrder, setConfirmedOrder] = React.useState(null);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const shipping = cartItems.length > 0 ? 5 : 0;
  const total = subtotal + tax + shipping;
  const subtotalINR = toINR(subtotal);
  const taxINR = toINR(tax);
  const shippingINR = toINR(shipping);
  const totalINR = toINR(total);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email || !formData.address || !formData.location) {
      alert('Please fill in all delivery details');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.dispatchEvent(new Event('open-login'));
        alert('Please login before placing order');
        return;
      }

      const items = cartItems.map((it) => ({
        productId: it.id,
        name: it.name,
        price: toINR(it.price),
        quantity: it.quantity,
        emoji: it.emoji
      }));

      const resp = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items,
          paymentMethod: selectedPayment,
          deliveryName: formData.name,
          deliveryPhone: formData.phone,
          deliveryEmail: formData.email,
          deliveryAddress: formData.address,
          deliveryLocation: formData.location
        })
      });

      const data = await resp.json();

      // Handle session expiry / invalid token explicitly
      if (!data.success && (data.message === 'Invalid token' || data.message === 'Missing token' || resp.status === 401)) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.dispatchEvent(new Event('storage')); // trigger Navbar update
        window.dispatchEvent(new Event('open-login')); // open login modal
        alert('Session expired or invalid. Please login again to place order.');
        return;
      }

      if (!data.success) {
        alert(data.message || 'Order failed');
        return;
      }

      // if COD, clear cart and show confirmation (offer invoice download)
      if (selectedPayment === 'cod') {
        cartItems.forEach((it) => removeItem(it.id));
        // store returned order for invoice generation and confirmation view
        setConfirmedOrder(data.order || { _id: data.orderId });
      } else {
        // for card/upi/netbanking, go to payment page
        if (typeof setPaymentOrderId === 'function') setPaymentOrderId(data.orderId);
        setCurrentPage?.('payment');
      }
    } catch (err) {
      console.error(err);
      alert('Order error');
    } finally {
      setLoading(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1a12] to-[#051108] p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-[#07110a] p-8 rounded-lg border border-green-600 shadow-2xl text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-green-400 mb-2">Order Places Successfully!</h2>
          <p className="text-gray-300 mb-6">Thank you for your purchase. Your order has been confirmed.</p>

          <div className="bg-green-900/20 p-4 rounded border border-green-800 mb-8 inline-block text-left">
            <p className="text-sm text-gray-400">Order ID:</p>
            <p className="text-lg font-mono text-white mb-2">{confirmedOrder._id}</p>
            <p className="text-sm text-gray-400">Total Amount:</p>
            <p className="text-lg font-bold text-green-300">₹{confirmedOrder.total}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => generateInvoicePDF(confirmedOrder)}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
            >
              📄 Download Invoice
            </button>
            <button
              onClick={() => { setConfirmedOrder(null); setCurrentPage?.('home'); }}
              className="px-6 py-3 border border-green-500 text-green-400 hover:bg-green-900/30 font-bold rounded-lg transition"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1a12] to-[#051108] p-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setCurrentPage?.('home')}
          className="mb-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600"
        >
          ← Back
        </button>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Delivery Details Form */}
          <div className="bg-[#07110a] p-6 rounded-lg border border-green-700">
            <h2 className="text-2xl font-bold text-green-300 mb-4">Delivery Details</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full mt-1 px-3 py-2 bg-[#0b2a1a] border border-green-700 rounded text-white outline-none focus:border-green-400"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full mt-1 px-3 py-2 bg-[#0b2a1a] border border-green-700 rounded text-white outline-none focus:border-green-400"
                  placeholder="10-digit phone number"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full mt-1 px-3 py-2 bg-[#0b2a1a] border border-green-700 rounded text-white outline-none focus:border-green-400"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Delivery Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full mt-1 px-3 py-2 bg-[#0b2a1a] border border-green-700 rounded text-white outline-none focus:border-green-400 h-24"
                  placeholder="House/Flat number, street, area"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Location / City</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full mt-1 px-3 py-2 bg-[#0b2a1a] border border-green-700 rounded text-white outline-none focus:border-green-400"
                  placeholder="City, State, Pincode"
                />
              </div>

              <div className="border-t border-green-700 pt-4 mt-4">
                <label className="text-sm text-gray-400 block mb-3">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {['card', 'upi', 'netbanking', 'cod'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedPayment(method)}
                      className={`px-3 py-2 rounded text-sm font-semibold transition ${selectedPayment === method
                        ? 'bg-green-700 text-white border-green-400'
                        : 'bg-transparent border border-green-700 text-gray-300 hover:text-white'
                        }`}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : `Proceed to ${selectedPayment === 'cod' ? 'Confirmation' : 'Payment'}`}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="bg-[#07110a] p-6 rounded-lg border border-green-700 h-fit">
            <h3 className="text-xl font-bold text-green-300 mb-4">Order Summary</h3>

            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between py-2 border-b border-green-800/30">
                  <div>
                    <div className="text-sm font-semibold">{item.emoji} {item.name}</div>
                    <div className="text-xs text-gray-400">Qty: {item.quantity}</div>
                  </div>
                  <div className="text-sm text-green-400">{formatINR(toINR(item.price * item.quantity))}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-green-700 pt-4 space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>{formatINR(subtotalINR)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Tax (10%)</span>
                <span>{formatINR(taxINR)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Shipping</span>
                <span>{formatINR(shippingINR)}</span>
              </div>
              <div className="flex justify-between text-green-300 text-lg font-bold border-t border-green-700 pt-2">
                <span>Total</span>
                <span>{formatINR(totalINR)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
