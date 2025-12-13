import React, { useState, useEffect } from "react";
import SearchModal from "./SearchModal";
import Notifications from "./Notifications";
import LogoImg from "../assets/logo2.jpg";

// Use Vite env variable (must be prefixed with VITE_) when building with Vite.
const API_BASE = "https://newplant-8.onrender.com";

const Navbar = ({ setCurrentPage, setShowCart, cartCount = 0, addToCart }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfilePhoto, setShowProfilePhoto] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    // keep user state in sync if localStorage changed elsewhere
    const handler = () => {
      try {
        const raw = localStorage.getItem("auth_user");
        setUser(raw ? JSON.parse(raw) : null);
      } catch (e) { }
    };
    window.addEventListener("storage", handler);
    // listen for global events to open login/signup from other components (e.g., Cart)
    const openLogin = () => setShowLogin(true);
    const openSignup = () => setShowSignup(true);
    window.addEventListener('open-login', openLogin);
    window.addEventListener('open-signup', openSignup);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener('open-login', openLogin);
      window.removeEventListener('open-signup', openSignup);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const resp = await fetch(`${API_BASE}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await resp.json();
        if (data.success) setUnreadCount(data.unreadCount || 0);
      } catch (e) { }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // helper: request password reset
  const requestPasswordReset = async (emailToUse) => {
    try {
      const resp = await fetch(`${API_BASE}/api/request-password-reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailToUse }) });
      const data = await resp.json();
      return { ok: resp.ok, data };
    } catch (err) {
      return { ok: false, data: { message: 'Network error' } };
    }
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      (async () => {
        try {
          const base64 = reader.result;
          const token = localStorage.getItem('auth_token');
          if (!token) return alert('Please login to upload photo');
          const resp = await fetch(`${API_BASE}/api/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ profilePhoto: base64 })
          });
          const data = await resp.json();
          if (!data.success) return alert(data.message || 'Upload failed');
          localStorage.setItem("auth_user", JSON.stringify(data.user));
          setUser(data.user);
          setShowProfilePhoto(false);
        } catch (err) {
          console.error(err);
          alert('Upload error');
        }
      })();
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <nav className="w-full py-4 px-6 flex items-center justify-between bg-[#071018] text-white backdrop-blur-sm shadow-sm border-b border-green-700 sticky top-0 z-50">

        <div className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition" onClick={() => setCurrentPage?.("home")}>
          <img src={LogoImg} alt="jeevaLeaf Logo" className="h-16 w-16 rounded-full object-cover shadow-lg" />
          <div className="flex flex-col items-start">
            <span className="text-2xl font-bold" style={{ color: '#E6C676' }}>JeevaLeaf</span>
            <span className="text-xs font-semibold" style={{ color: '#E6C676' }}>Bring life in our home</span>
          </div>
        </div>

        <ul className="hidden md:flex items-center gap-8 text-lg">
          <li onClick={() => setCurrentPage?.("home")} className="hover:text-green-400 cursor-pointer transition">Home</li>
          <li onClick={() => setCurrentPage?.("shop")} className="hover:text-green-400 cursor-pointer transition">Shop</li>
          <li onClick={() => setCurrentPage?.("about")} className="hover:text-green-400 cursor-pointer transition">About Us</li>
          <li onClick={() => setCurrentPage?.("contact")} className="hover:text-green-400 cursor-pointer transition">Contact</li>
        </ul>

        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search plants..."
            onClick={() => setShowSearch(true)}
            className="px-4 py-2 rounded-full bg-[#0b2a1a] border border-green-700 text-white w-40 md:w-56 outline-none focus:border-green-400 transition cursor-pointer"
            readOnly
          />

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-2xl text-white hover:text-green-400 transition mr-2"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && <Notifications onClose={() => setShowNotifications(false)} />}
            </div>
          )}

          <button onClick={() => setShowCart?.(true)} className="relative text-2xl text-white hover:text-green-400 transition">
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition"
              >
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase() || '👤'}
                  </div>
                )}
                {user.name}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[#071018] border-2 border-green-700 rounded-lg shadow-lg z-50 overflow-hidden">
                  {/* Profile Section */}
                  <div className="bg-gradient-to-r from-green-900/30 to-green-800/30 p-4 border-b border-green-700">
                    <div className="flex items-center gap-3">
                      {user.profilePhoto ? (
                        <img src={user.profilePhoto} alt={user.name} className="w-12 h-12 rounded-full object-cover border-2 border-green-500" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-xl font-bold text-white">
                          {user.name?.charAt(0).toUpperCase() || '👤'}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-green-300 font-semibold">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowProfilePhoto(true)}
                      className="w-full mt-3 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition flex items-center justify-center gap-2"
                    >
                      📷 Upload Photo
                    </button>
                  </div>

                  {/* Menu Items */}
                  <button
                    onClick={() => {
                      setCurrentPage?.('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-green-900/30 border-b border-green-800 text-gray-300 hover:text-green-300 transition"
                  >
                    👤 My Profile
                  </button>

                  <button
                    onClick={() => {
                      setCurrentPage?.('myorders');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-green-900/30 border-b border-green-800 text-gray-300 hover:text-green-300 transition"
                  >
                    📦 Your Orders
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      alert('Support coming soon!');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-green-900/30 border-b border-green-800 text-gray-300 hover:text-green-300 transition"
                  >
                    🆘 Need Help
                  </button>

                  <button
                    onClick={() => {
                      setCurrentPage?.('wishlist');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-green-900/30 border-b border-green-800 text-gray-300 hover:text-green-300 transition"
                  >
                    ❤️ Your Wishlist
                  </button>

                  <button
                    onClick={() => {
                      setCurrentPage?.('wallet');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-green-900/30 border-b border-green-800 text-gray-300 hover:text-green-300 transition"
                  >
                    💳 Wallet
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setCurrentPage?.('admin');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-900/30 border-b border-indigo-800 text-gray-300 hover:text-indigo-300 transition"
                    >
                      🛡️ Admin Dashboard
                    </button>
                  )}

                  <button
                    onClick={() => {
                      localStorage.removeItem("auth_token");
                      localStorage.removeItem("auth_user");
                      setUser(null);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-red-900/30 text-gray-300 hover:text-red-300 transition"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowLogin(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition"
              >
                🔐 Login
              </button>

              <button
                onClick={() => setShowSignup(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition"
              >
                📝 Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Search Modal */}
      <SearchModal showSearch={showSearch} setShowSearch={setShowSearch} setCurrentPage={setCurrentPage} addToCart={addToCart} />

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#071018] border-2 border-green-600 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-green-400">🌿 Login</h2>
              <button onClick={() => setShowLogin(false)} className="text-3xl text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 transition"
              />

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 transition"
              />

              <button onClick={async () => {
                try {
                  const resp = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                  });
                  const data = await resp.json();
                  if (!data.success) return alert(data.message || 'Login failed');
                  localStorage.setItem('auth_token', data.token);
                  localStorage.setItem('auth_user', JSON.stringify(data.user));
                  setUser(data.user);
                  setShowLogin(false);
                  setEmail(''); setPassword('');
                } catch (err) {
                  console.error(err);
                  alert('Login error');
                }
              }} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition transform hover:scale-105">
                🔓 Login
              </button>

              <p className="text-center text-gray-400">
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setShowLogin(false);
                    setShowSignup(true);
                  }}
                  className="text-green-400 hover:text-green-300 font-bold"
                >
                  Sign Up
                </button>
              </p>

              <p className="text-center mt-2">
                <button onClick={() => { setShowLogin(false); setShowForgot(true); }} className="text-sm text-yellow-300 hover:underline">Forgot password?</button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#071018] border-2 border-green-600 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-green-400">🔑 Forgot Password</h2>
              <button onClick={() => setShowForgot(false)} className="text-3xl text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 transition" />
              <button onClick={async () => {
                if (!email || !/^\S+@\S+\.\S+$/.test(email)) return alert('Enter valid email');
                const resp = await requestPasswordReset(email);
                alert(resp.data.message || (resp.ok ? 'Token sent' : 'Failed'));
              }} className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg">Send reset code</button>

              <p className="text-sm text-gray-400">After you receive the code, enter it below with your new password.</p>

              <input type="text" placeholder="Reset code" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 transition" />
              <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 transition" />

              <button onClick={async () => {
                if (!email || !otp || !password) return alert('Email, code and new password required');
                try {
                  const res = await fetch(`${API_BASE}/api/verify-reset-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, token: otp, newPassword: password }) });
                  const data = await res.json();
                  if (!res.ok) return alert(data.message || 'Reset failed');
                  alert('Password updated. You can now login.');
                  setShowForgot(false); setPassword(''); setOtp('');
                } catch (err) { alert('Network error'); }
              }} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg">Verify & Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal (regular signup OR OTP flow) */}
      {showSignup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#071018] border-2 border-green-600 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-green-400">🌱 Sign Up</h2>
              <button onClick={() => setShowSignup(false)} className="text-3xl text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 transition"
              />

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 transition"
              />

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0b2a1a] border border-green-700 rounded-lg text-white outline-none focus:border-green-400 transition"
              />

              <button onClick={async () => {
                if (!name || !email || !password) { alert('All fields are required'); return; }
                if (!/^\S+@\S+\.\S+$/.test(email)) { alert('Enter a valid email'); return; }

                try {
                  const resp = await fetch(`${API_BASE}/api/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email: email.toLowerCase(), password })
                  });
                  const data = await resp.json();
                  if (!resp.ok) {
                    alert(data.message || 'Signup failed');
                    return;
                  }

                  // Success: login the user
                  localStorage.setItem('auth_token', data.token);
                  localStorage.setItem('auth_user', JSON.stringify(data.user));
                  setUser(data.user);
                  setShowSignup(false);
                  setName(''); setEmail(''); setPassword('');
                  alert('Account created successfully!');
                } catch (err) {
                  console.error('Signup error', err);
                  alert('Network error while creating account');
                }
              }} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition transform hover:scale-105">
                ✓ Create Account
              </button>

              <div className="flex gap-2">
                <button onClick={() => { setShowSignup(false); setShowLogin(true); }} className="w-full py-3 bg-gray-700 text-white rounded-lg">Already have an account? Login</button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Profile Photo Upload Modal */}
      {showProfilePhoto && user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#071018] border-2 border-green-600 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-green-400">📷 Upload Photo</h2>
              <button onClick={() => setShowProfilePhoto(false)} className="text-3xl text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Photo Preview */}
              <div className="flex justify-center mb-6">
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user.name} className="w-24 h-24 rounded-full object-cover border-4 border-green-500" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center text-4xl">
                    👤
                  </div>
                )}
              </div>

              {/* File Input */}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                  className="hidden"
                  id="photoInput"
                />
                <div className="p-4 border-2 border-dashed border-green-600 rounded-xl hover:bg-green-900/10 cursor-pointer transition text-center">
                  <span className="text-green-400 font-semibold">
                    Click to upload or drag & drop
                  </span>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
                </div>
              </label>

              <button
                onClick={() => document.getElementById('photoInput')?.click()}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition transform hover:scale-105"
              >
                🖼️ Choose File
              </button>

              {user.profilePhoto && (
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('auth_token');
                      if (!token) return alert('Please login to remove photo');
                      const resp = await fetch(`${API_BASE}/api/me`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ profilePhoto: null })
                      });
                      const data = await resp.json();
                      if (!data.success) return alert(data.message || 'Could not remove photo');
                      localStorage.setItem('auth_user', JSON.stringify(data.user));
                      setUser(data.user);
                    } catch (err) {
                      console.error(err);
                      alert('Error removing photo');
                    }
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition"
                >
                  🗑️ Remove Photo
                </button>
              )}

              <button
                onClick={() => setShowProfilePhoto(false)}
                className="w-full py-3 border-2 border-gray-600 text-gray-300 hover:text-white font-bold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
