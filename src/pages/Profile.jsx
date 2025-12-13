import React, { useState, useEffect } from "react";

const API_BASE = "https://newplant-9.onrender.com";

const Profile = () => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState("account");
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [showPassword2FA, setShowPassword2FA] = useState(false);
  const [password2FA, setPassword2FA] = useState("");
  const [otp2FA, setOtp2FA] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.twoFAEnabled || false);

  // Addresses state
  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [defaultAddressId, setDefaultAddressId] = useState(user?.defaultAddressId || null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    id: Date.now().toString(),
    label: "",
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    isDefault: false
  });

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState(user?.paymentMethods || []);
  const [defaultPaymentId, setDefaultPaymentId] = useState(user?.defaultPaymentId || null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [newPayment, setNewPayment] = useState({
    id: Date.now().toString(),
    type: "card", // card, upi, giftcard
    label: "",
    cardNumber: "",
    cardholderName: "",
    expiryDate: "",
    cvv: "",
    upiId: "",
    giftCardNumber: "",
    giftCardBalance: 0,
    isDefault: false
  });

  // Account settings state
  const [accountSettings, setAccountSettings] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Sync user to localStorage
  // Keep local state in sync with server when changes happen
  useEffect(() => {
    if (user) {
      const updatedUser = {
        ...user,
        addresses,
        defaultAddressId,
        paymentMethods,
        defaultPaymentId,
        walletBalance,
        twoFAEnabled
      };
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));
    }
  }, [addresses, defaultAddressId, paymentMethods, defaultPaymentId, walletBalance, twoFAEnabled, user]);

  const getAuthToken = () => localStorage.getItem('auth_token');

  const updateUserOnServer = async (fields) => {
    try {
      const token = getAuthToken();
      if (!token) return alert('Please login to save changes');
      const resp = await fetch(`${API_BASE}/api/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(fields)
      });
      const data = await resp.json();
      if (!data.success) return alert(data.message || 'Failed to update profile');
      setUser(data.user);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      console.error(err);
      alert('Update failed');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a1a12] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-400 mb-4">🔐 Login Required</h1>
          <p className="text-gray-300">Please login to view your profile</p>
        </div>
      </div>
    );
  }

  // ===== ACCOUNT SETTINGS HANDLERS =====
  const handleAccountUpdate = (field, value) => {
    setAccountSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveAccountChanges = () => {
    const fields = {
      name: accountSettings.name,
      email: accountSettings.email,
      phone: accountSettings.phone
    };
    updateUserOnServer(fields).then(() => {
      alert("✓ Account settings updated!");
      setEditingField(null);
    });
  };

  const handlePasswordChange = async () => {
    if (!accountSettings.currentPassword || !accountSettings.newPassword || !accountSettings.confirmPassword) {
      return alert("Please fill all password fields");
    }
    if (accountSettings.newPassword !== accountSettings.confirmPassword) {
      return alert("New passwords don't match");
    }
    // Send new password to backend (server will hash)
    updateUserOnServer({ password: accountSettings.newPassword }).then(() => {
      alert("✓ Password changed successfully!");
      setAccountSettings(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
    });
  };

  const handleEnable2FA = () => {
    setShowPassword2FA(true);
  };

  const verifyAndEnable2FA = async () => {
    if (!password2FA || !otp2FA) {
      return alert("Please enter password and OTP");
    }
    // In real app, verify with backend
    // Persist 2FA flag on server
    updateUserOnServer({ twoFAEnabled: true }).then(() => {
      setTwoFAEnabled(true);
      setShowPassword2FA(false);
      setPassword2FA("");
      setOtp2FA("");
      alert("✓ Two-Factor Authentication enabled!");
    });
  };

  // ===== ADDRESS HANDLERS =====
  const addAddress = () => {
    if (!newAddress.fullName || !newAddress.addressLine1 || !newAddress.city || !newAddress.pincode) {
      return alert("Please fill all required fields");
    }

    const addressToAdd = {
      ...newAddress,
      id: Date.now().toString(),
      isDefault: addresses.length === 0 // First address is default
    };

    const updatedAddresses = [...addresses, addressToAdd];
    const updatedDefault = addressToAdd.isDefault ? addressToAdd.id : defaultAddressId;
    // Persist to server
    updateUserOnServer({ addresses: updatedAddresses, defaultAddressId: updatedDefault }).then((u) => {
      setAddresses(u.addresses || updatedAddresses);
      setDefaultAddressId(u.defaultAddressId || updatedDefault);
      setShowAddressForm(false);
      setNewAddress({
        id: Date.now().toString(),
        label: "",
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
        isDefault: false
      });
      alert("✓ Address added successfully!");
    });
  };

  const deleteAddress = (id) => {
    if (window.confirm("Delete this address?")) {
      const filtered = addresses.filter(a => a.id !== id);
      const newDefault = defaultAddressId === id && filtered.length > 0 ? filtered[0].id : defaultAddressId === id ? null : defaultAddressId;
      updateUserOnServer({ addresses: filtered, defaultAddressId: newDefault }).then((u) => {
        setAddresses(u.addresses || filtered);
        setDefaultAddressId(u.defaultAddressId || newDefault);
      });
    }
  };

  const setDefaultAddress = (id) => {
    updateUserOnServer({ defaultAddressId: id }).then((u) => {
      setDefaultAddressId(u.defaultAddressId || id);
      setAddresses(u.addresses || addresses);
    });
  };

  // ===== PAYMENT METHODS HANDLERS =====
  const addPaymentMethod = () => {
    if (newPayment.type === "card") {
      if (!newPayment.cardNumber || !newPayment.cardholderName || !newPayment.expiryDate || !newPayment.cvv) {
        return alert("Please fill all card details");
      }
    } else if (newPayment.type === "upi") {
      if (!newPayment.upiId) {
        return alert("Please enter UPI ID");
      }
    } else if (newPayment.type === "giftcard") {
      if (!newPayment.giftCardNumber || !newPayment.giftCardBalance) {
        return alert("Please enter gift card details");
      }
    }

    const methodToAdd = {
      ...newPayment,
      id: Date.now().toString(),
      isDefault: paymentMethods.length === 0
    };

    const updatedMethods = [...paymentMethods, methodToAdd];
    const updatedDefault = methodToAdd.isDefault ? methodToAdd.id : defaultPaymentId;
    updateUserOnServer({ paymentMethods: updatedMethods, defaultPaymentId: updatedDefault }).then((u) => {
      setPaymentMethods(u.paymentMethods || updatedMethods);
      setDefaultPaymentId(u.defaultPaymentId || updatedDefault);
      setShowPaymentForm(false);
      setNewPayment({
        id: Date.now().toString(),
        type: "card",
        label: "",
        cardNumber: "",
        cardholderName: "",
        expiryDate: "",
        cvv: "",
        upiId: "",
        giftCardNumber: "",
        giftCardBalance: 0,
        isDefault: false
      });
      alert("✓ Payment method added!");
    });
  };

  const deletePaymentMethod = (id) => {
    if (window.confirm("Delete this payment method?")) {
      const filtered = paymentMethods.filter(p => p.id !== id);
      const newDefault = defaultPaymentId === id && filtered.length > 0 ? filtered[0].id : defaultPaymentId === id ? null : defaultPaymentId;
      updateUserOnServer({ paymentMethods: filtered, defaultPaymentId: newDefault }).then((u) => {
        setPaymentMethods(u.paymentMethods || filtered);
        setDefaultPaymentId(u.defaultPaymentId || newDefault);
      });
    }
  };

  const setDefaultPaymentMethod = (id) => {
    updateUserOnServer({ defaultPaymentId: id }).then((u) => {
      setDefaultPaymentId(u.defaultPaymentId || id);
      setPaymentMethods(u.paymentMethods || paymentMethods);
    });
  };

  const addWalletBalance = () => {
    const amount = prompt("Enter amount to add (₹):", "100");
    if (amount && !isNaN(amount)) {
      const newBalance = walletBalance + parseFloat(amount);
      updateUserOnServer({ walletBalance: newBalance }).then((u) => {
        setWalletBalance(u.walletBalance || newBalance);
        alert(`✓ ₹${amount} added to wallet!`);
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1a12] py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900/30 to-green-800/30 border-2 border-green-700 rounded-3xl p-8 mb-8">
          <div className="flex items-center gap-6">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="w-24 h-24 rounded-full object-cover border-4 border-green-500" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center text-5xl font-bold text-white">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-green-400">{user.name}</h1>
              <p className="text-gray-400 text-lg">{user.email}</p>
              <p className="text-gray-500 text-sm mt-1">Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {[
            { id: "account", icon: "⚙️", label: "Account Settings" },
            { id: "addresses", icon: "📍", label: "Addresses" },
            { id: "payments", icon: "💳", label: "Payment Methods" },
            { id: "wallet", icon: "💰", label: "Wallet" },
            { id: "security", icon: "🔒", label: "Security" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-4 rounded-xl font-semibold transition transform hover:scale-105 ${activeTab === tab.id
                ? "bg-green-600 text-white border-2 border-green-400"
                : "bg-green-900/20 border-2 border-green-700 text-green-300 hover:border-green-500"
                }`}
            >
              <div className="text-2xl mb-1">{tab.icon}</div>
              <div className="text-sm">{tab.label}</div>
            </button>
          ))}
        </div>

        {/* ===== ACCOUNT SETTINGS TAB ===== */}
        {activeTab === "account" && (
          <div className="bg-gradient-to-br from-green-900/20 to-black/40 border-2 border-green-700 rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-green-400 mb-8">⚙️ Account Settings</h2>

            <div className="space-y-6">
              {/* Name */}
              <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50">
                <label className="text-gray-400 text-sm font-semibold mb-2 block">Full Name</label>
                {editingField === "name" ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={accountSettings.name}
                      onChange={(e) => handleAccountUpdate("name", e.target.value)}
                      className="flex-1 px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400"
                    />
                    <button onClick={saveAccountChanges} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition">
                      ✓ Save
                    </button>
                    <button onClick={() => setEditingField(null)} className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition">
                      ✕ Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-white text-lg">{accountSettings.name}</p>
                    <button onClick={() => {
                      setEditingField("name");
                      setTempValue(accountSettings.name);
                    }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50">
                <label className="text-gray-400 text-sm font-semibold mb-2 block">Email Address</label>
                {editingField === "email" ? (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={accountSettings.email}
                      onChange={(e) => handleAccountUpdate("email", e.target.value)}
                      className="flex-1 px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400"
                    />
                    <button onClick={saveAccountChanges} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition">
                      ✓ Save
                    </button>
                    <button onClick={() => setEditingField(null)} className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition">
                      ✕ Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-white text-lg">{accountSettings.email}</p>
                    <button onClick={() => {
                      setEditingField("email");
                      setTempValue(accountSettings.email);
                    }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50">
                <label className="text-gray-400 text-sm font-semibold mb-2 block">Phone Number</label>
                {editingField === "phone" ? (
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={accountSettings.phone}
                      onChange={(e) => handleAccountUpdate("phone", e.target.value)}
                      className="flex-1 px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400"
                    />
                    <button onClick={saveAccountChanges} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition">
                      ✓ Save
                    </button>
                    <button onClick={() => setEditingField(null)} className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition">
                      ✕ Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-white text-lg">{accountSettings.phone || "Not added"}</p>
                    <button onClick={() => {
                      setEditingField("phone");
                      setTempValue(accountSettings.phone);
                    }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition">
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Change Password */}
              <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50">
                <h3 className="text-green-300 font-semibold mb-4">🔑 Change Password</h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={accountSettings.currentPassword}
                    onChange={(e) => handleAccountUpdate("currentPassword", e.target.value)}
                    className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={accountSettings.newPassword}
                    onChange={(e) => handleAccountUpdate("newPassword", e.target.value)}
                    className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400"
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={accountSettings.confirmPassword}
                    onChange={(e) => handleAccountUpdate("confirmPassword", e.target.value)}
                    className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400"
                  />
                  <button onClick={handlePasswordChange} className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition">
                    🔄 Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== ADDRESSES TAB ===== */}
        {activeTab === "addresses" && (
          <div className="bg-gradient-to-br from-green-900/20 to-black/40 border-2 border-green-700 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-green-400">📍 Shipping Addresses</h2>
              <button onClick={() => setShowAddressForm(!showAddressForm)} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition">
                ➕ Add Address
              </button>
            </div>

            {/* Add Address Form */}
            {showAddressForm && (
              <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50 mb-8">
                <h3 className="text-green-300 font-semibold mb-4">New Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Label (e.g., Home, Office)" value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                  <input type="text" placeholder="Full Name *" value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                  <input type="tel" placeholder="Phone *" value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                  <input type="text" placeholder="City *" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                  <input type="text" placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                  <input type="text" placeholder="Pincode *" value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                  <textarea placeholder="Address Line 1 *" value={newAddress.addressLine1} onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 col-span-1 md:col-span-2" />
                  <textarea placeholder="Address Line 2 (Optional)" value={newAddress.addressLine2} onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 col-span-1 md:col-span-2" />
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={addAddress} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition">
                    ✓ Save Address
                  </button>
                  <button onClick={() => setShowAddressForm(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition">
                    ✕ Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Addresses List */}
            {addresses.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No addresses added yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map(addr => (
                  <div key={addr.id} className={`p-6 rounded-2xl border-2 transition ${defaultAddressId === addr.id ? "bg-green-900/30 border-green-500" : "bg-green-900/10 border-green-700/50"}`}>
                    {defaultAddressId === addr.id && <div className="text-xs bg-green-600 w-fit px-2 py-1 rounded text-white mb-2">⭐ Default</div>}
                    <h3 className="font-semibold text-green-300 mb-2">{addr.label || "Address"}</h3>
                    <p className="text-gray-300 text-sm mb-1">{addr.fullName}</p>
                    <p className="text-gray-400 text-sm mb-1">{addr.addressLine1}</p>
                    {addr.addressLine2 && <p className="text-gray-400 text-sm mb-1">{addr.addressLine2}</p>}
                    <p className="text-gray-400 text-sm mb-1">{addr.city}, {addr.state} - {addr.pincode}</p>
                    <p className="text-gray-400 text-sm mb-4">{addr.phone}</p>
                    <div className="flex gap-2">
                      {defaultAddressId !== addr.id && (
                        <button onClick={() => setDefaultAddress(addr.id)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
                          Set as Default
                        </button>
                      )}
                      <button onClick={() => deleteAddress(addr.id)} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== PAYMENT METHODS TAB ===== */}
        {activeTab === "payments" && (
          <div className="bg-gradient-to-br from-green-900/20 to-black/40 border-2 border-green-700 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-green-400">💳 Payment Methods</h2>
              <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition">
                ➕ Add Payment
              </button>
            </div>

            {/* Add Payment Form */}
            {showPaymentForm && (
              <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50 mb-8">
                <h3 className="text-green-300 font-semibold mb-4">Add Payment Method</h3>

                <div className="flex gap-2 mb-4">
                  {["card", "upi", "giftcard"].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewPayment({ ...newPayment, type })}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${newPayment.type === type ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"}`}
                    >
                      {type === "card" ? "💳 Card" : type === "upi" ? "📱 UPI" : "🎁 Gift Card"}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 mb-4">
                  <input type="text" placeholder="Label (e.g., My Visa)" value={newPayment.label} onChange={(e) => setNewPayment({ ...newPayment, label: e.target.value })} className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />

                  {newPayment.type === "card" && (
                    <>
                      <input type="text" placeholder="Card Number" value={newPayment.cardNumber} onChange={(e) => setNewPayment({ ...newPayment, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })} className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                      <input type="text" placeholder="Cardholder Name" value={newPayment.cardholderName} onChange={(e) => setNewPayment({ ...newPayment, cardholderName: e.target.value })} className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="MM/YY" value={newPayment.expiryDate} onChange={(e) => setNewPayment({ ...newPayment, expiryDate: e.target.value })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                        <input type="password" placeholder="CVV" value={newPayment.cvv} onChange={(e) => setNewPayment({ ...newPayment, cvv: e.target.value.slice(0, 3) })} className="px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                      </div>
                    </>
                  )}

                  {newPayment.type === "upi" && (
                    <input type="text" placeholder="UPI ID (e.g., user@bankname)" value={newPayment.upiId} onChange={(e) => setNewPayment({ ...newPayment, upiId: e.target.value })} className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                  )}

                  {newPayment.type === "giftcard" && (
                    <>
                      <input type="text" placeholder="Gift Card Number" value={newPayment.giftCardNumber} onChange={(e) => setNewPayment({ ...newPayment, giftCardNumber: e.target.value })} className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                      <input type="number" placeholder="Balance (₹)" value={newPayment.giftCardBalance} onChange={(e) => setNewPayment({ ...newPayment, giftCardBalance: parseFloat(e.target.value) })} className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400" />
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={addPaymentMethod} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition">
                    ✓ Save
                  </button>
                  <button onClick={() => setShowPaymentForm(false)} className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition">
                    ✕ Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Payment Methods List */}
            {paymentMethods.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No payment methods added</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paymentMethods.map(pm => (
                  <div key={pm.id} className={`p-6 rounded-2xl border-2 transition ${defaultPaymentId === pm.id ? "bg-green-900/30 border-green-500" : "bg-green-900/10 border-green-700/50"}`}>
                    {defaultPaymentId === pm.id && <div className="text-xs bg-green-600 w-fit px-2 py-1 rounded text-white mb-2">⭐ Default</div>}

                    {pm.type === "card" && (
                      <>
                        <p className="text-green-300 font-semibold mb-2">💳 {pm.label}</p>
                        <p className="text-gray-300 text-lg tracking-wider mb-1">•••• •••• •••• {pm.cardNumber.slice(-4)}</p>
                        <p className="text-gray-400 text-sm mb-4">Expires: {pm.expiryDate}</p>
                      </>
                    )}
                    {pm.type === "upi" && (
                      <>
                        <p className="text-green-300 font-semibold mb-2">📱 {pm.label}</p>
                        <p className="text-gray-300 mb-4">{pm.upiId}</p>
                      </>
                    )}
                    {pm.type === "giftcard" && (
                      <>
                        <p className="text-green-300 font-semibold mb-2">🎁 {pm.label}</p>
                        <p className="text-gray-300 mb-1">Balance: ₹{pm.giftCardBalance}</p>
                        <p className="text-gray-400 text-sm mb-4">Card: •••• {pm.giftCardNumber.slice(-4)}</p>
                      </>
                    )}

                    <div className="flex gap-2">
                      {defaultPaymentId !== pm.id && (
                        <button onClick={() => setDefaultPaymentMethod(pm.id)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
                          Set as Default
                        </button>
                      )}
                      <button onClick={() => deletePaymentMethod(pm.id)} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== WALLET TAB ===== */}
        {activeTab === "wallet" && (
          <div className="bg-gradient-to-br from-green-900/20 to-black/40 border-2 border-green-700 rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-green-400 mb-8">💰 Wallet</h2>

            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl p-8 text-white mb-8 shadow-lg">
              <p className="text-sm opacity-90 mb-2">Current Balance</p>
              <h1 className="text-5xl font-bold mb-4">₹{walletBalance.toFixed(2)}</h1>
              <button onClick={addWalletBalance} className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition backdrop-blur">
                ➕ Add Money
              </button>
            </div>

            <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50">
              <h3 className="text-green-300 font-semibold mb-4">How to use wallet</h3>
              <ul className="text-gray-300 space-y-2 text-sm">
                <li>✓ Use wallet balance for checkout</li>
                <li>✓ Earn cashback from orders to wallet</li>
                <li>✓ Redeem gift cards to wallet</li>
                <li>✓ Track spending across purchases</li>
              </ul>
            </div>
          </div>
        )}

        {/* ===== SECURITY TAB ===== */}
        {activeTab === "security" && (
          <div className="bg-gradient-to-br from-green-900/20 to-black/40 border-2 border-green-700 rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-green-400 mb-8">🔒 Security Settings</h2>

            <div className="space-y-6">
              {/* Two-Factor Authentication */}
              <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-green-300 font-semibold mb-2">🔐 Two-Factor Authentication (2FA)</h3>
                    <p className="text-gray-400 text-sm">Add an extra layer of security to your account</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-semibold ${twoFAEnabled ? "bg-green-600 text-white" : "bg-gray-600 text-white"}`}>
                    {twoFAEnabled ? "✓ Enabled" : "Disabled"}
                  </div>
                </div>

                {!twoFAEnabled ? (
                  <button onClick={handleEnable2FA} className="mt-4 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition">
                    🔓 Enable 2FA
                  </button>
                ) : (
                  <button onClick={() => setTwoFAEnabled(false)} className="mt-4 w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition">
                    🔒 Disable 2FA
                  </button>
                )}

                {/* 2FA Verification Modal */}
                {showPassword2FA && (
                  <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={password2FA}
                      onChange={(e) => setPassword2FA(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 mb-3"
                    />
                    <input
                      type="text"
                      placeholder="Enter OTP sent to your email"
                      value={otp2FA}
                      onChange={(e) => setOtp2FA(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 mb-3"
                    />
                    <button onClick={verifyAndEnable2FA} className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition">
                      ✓ Verify & Enable
                    </button>
                  </div>
                )}
              </div>

              {/* Password Security */}
              <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50">
                <h3 className="text-green-300 font-semibold mb-4">🔑 Password Strength</h3>
                <div className="bg-yellow-500/20 border border-yellow-500 p-4 rounded-lg mb-4">
                  <p className="text-yellow-300 text-sm">💡 Pro tip: Use a strong password with uppercase, lowercase, numbers, and special characters</p>
                </div>
                <button onClick={() => setActiveTab("account")} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition">
                  🔄 Change Password
                </button>
              </div>

              {/* Active Sessions */}
              <div className="bg-green-900/10 p-6 rounded-2xl border border-green-700/50">
                <h3 className="text-green-300 font-semibold mb-4">📱 Active Sessions</h3>
                <p className="text-gray-300 mb-4">Current Device - Web Browser</p>
                <button className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition">
                  🚪 Logout from all other devices
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
