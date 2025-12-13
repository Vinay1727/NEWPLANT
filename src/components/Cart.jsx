import React from "react";
import { toINR, formatINR } from "../utils/priceUtils";

const API_BASE = "https://newplant-9.onrender.com";

const Cart = ({ showCart, setShowCart, cartItems = [], updateQuantity, removeItem, setCurrentPage, setPaymentOrderId }) => {
  // Compute subtotal in INR. Items may be stored in USD (default) or INR (csv/backend).
  const subtotalINR = cartItems.reduce((sum, item) => {
    const priceINR = item.currency === 'INR' ? Number(item.price || 0) : toINR(item.price || 0);
    return sum + priceINR * (item.quantity || 1);
  }, 0);

  const taxINR = +(subtotalINR * 0.1).toFixed(2);
  const shippingINR = cartItems.length > 0 ? toINR(5) : 0;
  const totalINR = +(subtotalINR + taxINR + shippingINR).toFixed(2);

  return (
    <>
      {showCart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full md:w-96 bg-[#071018] border-l-2 border-green-600 rounded-t-3xl p-6 max-h-screen overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-green-400">🛒 Shopping Cart</h2>
              <button onClick={() => setShowCart(false)} className="text-3xl text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-5xl mb-4">📭</p>
                <p className="text-gray-400 text-lg">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-green-900/20 border border-green-700 p-4 rounded-lg flex justify-between items-center"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-16 h-16 rounded-lg bg-gray-700 overflow-hidden flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-4xl">{item.emoji || '🌿'}</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold">{item.name}</h3>
                          <p className="text-green-400">{formatINR(item.currency === 'INR' ? Number(item.price || 0) : toINR(item.price || 0))}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-white font-bold"
                        >
                          −
                        </button>
                        <span className="px-3 font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-white font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-2 text-red-500 hover:text-red-400 text-xl"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pricing Summary */}
                <div className="border-t border-green-700 pt-4 space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal:</span>
                    <span>{formatINR(subtotalINR)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tax (10%):</span>
                    <span>{formatINR(taxINR)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Shipping:</span>
                    <span>{formatINR(shippingINR)}</span>
                  </div>
                  <div className="flex justify-between text-green-400 text-xl font-bold border-t border-green-700 pt-2">
                    <span>Total:</span>
                    <span>{formatINR(totalINR)}</span>
                  </div>
                </div>

                {/* Checkout Buttons */}
                <div className="mt-6 space-y-2">
                  <button
                    onClick={() => {
                      const token = localStorage.getItem('auth_token');
                      if (!token) {
                        window.dispatchEvent(new Event('open-login'));
                        alert('Please login or sign up before placing an order');
                        return;
                      }
                      setShowCart(false);
                      setCurrentPage?.('checkout');
                    }}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition transform hover:scale-105"
                  >
                    ✅ Proceed to Checkout
                  </button>
                  <button
                    onClick={() => setShowCart(false)}
                    className="w-full py-3 border border-green-600 hover:bg-green-600/10 text-white font-bold rounded-lg transition"
                  >
                    Continue Shopping
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}


    </>
  );
};

export default Cart;
