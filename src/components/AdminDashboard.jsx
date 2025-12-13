import React from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import InventoryManagement from './InventoryManagement';
import MarketingManagement from './MarketingManagement';

const API_BASE = 'https://newplant-9.onrender.com';

const AdminDashboard = ({ setCurrentPage }) => {
  const [orders, setOrders] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [users, setUsers] = React.useState([]);
  const [messages, setMessages] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState('');
  const [selectedMessage, setSelectedMessage] = React.useState(null);
  const [activeSection, setActiveSection] = React.useState('dashboard');
  const [adminToken] = React.useState(localStorage.getItem('auth_token') || '');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/admin/orders`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (!data.success) {
        // capture auth errors so we can show helpful UI
        setAuthError(data.message || 'Failed to fetch orders');
      } else {
        setOrders(data.orders || []);
        setAuthError('');
      }
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/admin/messages`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (!data.success) {
        setAuthError(data.message || 'Failed to fetch messages');
      } else {
        setMessages(data.messages || []);
        setAuthError('');
      }
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Failed to fetch messages');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (!data.success) {
        setAuthError(data.message || 'Failed to fetch users');
      } else {
        setUsers(data.users || []);
        setAuthError('');
      }
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Failed to fetch users');
    }
  };

  // fetch a single order from server (populated) and update local state
  const fetchOrderAndPopulate = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/admin/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (data.success && data.order) {
        // replace in orders array if exists
        setOrders(prev => prev.map(o => String(o._id) === String(id) ? data.order : o));
        return data.order;
      }
    } catch (e) { console.error(e); }
    return null;
  };

  // single useEffect to load both lists on mount
  React.useEffect(() => {
    fetchOrders();
    fetchUsers();
    fetchMessages();
  }, []);

  // when admin clicks sidebar links, scroll to sections
  React.useEffect(() => {
    if (!activeSection) return;
    try {
      if (activeSection === 'dashboard') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      const el = document.getElementById(`${activeSection}Section`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { console.warn(e); }
  }, [activeSection]);


  const loadOrder = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/admin/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (data.success) {
        setSelected(data.order);
        setAuthError('');
      } else {
        setAuthError(data.message || 'Failed to load order');
        // try to populate via helper
        const pop = await fetchOrderAndPopulate(id);
        if (pop) setSelected(pop);
      }
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Failed to load order');
    }
  };

  const loadMessage = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/admin/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (data.success) {
        setSelectedMessage(data.message);
      }
    } catch (err) { console.error(err); }
  };

  const markMessageRead = async (id, read) => {
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/admin/messages/${id}/mark-read`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ read })
      });
      const data = await resp.json();
      if (data.success) {
        await fetchMessages();
        if (selectedMessage && String(selectedMessage._id) === String(id)) setSelectedMessage(data.message);
      }
    } catch (err) { console.error(err); }
  };

  const deleteMessage = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/admin/messages/${id}/delete`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (data.success) {
        await fetchMessages();
        if (selectedMessage && String(selectedMessage._id) === String(id)) setSelectedMessage(null);
      }
    } catch (err) { console.error(err); }
  };

  const updateOrder = async (id, changes) => {
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`${API_BASE}/api/admin/orders/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(changes)
      });
      const data = await resp.json();
      if (data.success) {
        alert('Order updated');
        await fetchOrders();
        setSelected(data.order);
      } else {
        console.warn('Update failed:', data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter(o =>
    String(o._id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    // account for orders where `user` is just an id string (not populated)
    String((typeof o.user === 'string' ? (users.find(u => String(u._id) === String(o.user))?.name) : o.user?.name) || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String((typeof o.user === 'string' ? (users.find(u => String(u._id) === String(o.user))?.email) : o.user?.email) || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // helper to get a display-friendly user object for an order
  const resolveUserForOrder = (o) => {
    if (!o) return { name: 'Unknown', email: '—' };
    if (!o.user) return { name: 'Unknown', email: '—' };
    // if populated
    if (typeof o.user === 'object' && (o.user.name || o.user.email)) return o.user;
    // if it's an id string, look up in users array
    const found = users.find(u => String(u._id) === String(o.user));
    if (found) return found;
    return { name: 'Unknown', email: '—' };
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Modern Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-green-600/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">🌿 Admin Dashboard</h1>
            <p className="text-xs text-gray-400 mt-1">Manage orders, messages & users</p>
          </div>
          <button
            onClick={() => setCurrentPage?.('home')}
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-600/50"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {authError && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300 backdrop-blur-sm">
            <strong className="text-red-400">⚠ Admin Error:</strong> {authError}
          </div>
        )}

        {/* Enhanced Section Navigation */}
        <div className="mb-8 border-b border-gray-700 overflow-x-auto">
          <div className="flex gap-4">
            {[
              { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
              { id: 'analytics', label: '📈 Analytics', icon: '📈' },
              { id: 'inventory', label: '📦 Inventory', icon: '📦' },
              { id: 'marketing', label: '🎯 Marketing', icon: '🎯' },
            ].map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-6 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${activeSection === section.id
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar with Icon */}
        <div className="mb-8">
          <div className="relative">
            <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="🔍 Search orders, customers, emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-green-600/30 rounded-xl text-white placeholder-gray-500 outline-none focus:border-green-500 focus:bg-slate-800/80 focus:ring-2 focus:ring-green-500/20 transition-all"
            />
          </div>
        </div>

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <>
            {/* Stats Grid - Modern Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {/* Total Orders */}
              <div className="group relative bg-slate-800/40 backdrop-blur-sm border border-green-600/20 rounded-xl p-5 hover:border-green-500/50 hover:bg-slate-800/60 transition-all duration-300 shadow-xl hover:shadow-green-600/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">📦 Orders</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{orders.length}</h3>
                  </div>
                  <div className="text-2xl opacity-20 group-hover:opacity-40 transition-opacity">📊</div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Total transactions</p>
              </div>

              {/* Total Users */}
              <div className="group relative bg-slate-800/40 backdrop-blur-sm border border-blue-600/20 rounded-xl p-5 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all duration-300 shadow-xl hover:shadow-blue-600/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">👥 Users</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{users.length}</h3>
                  </div>
                  <div className="text-2xl opacity-20 group-hover:opacity-40 transition-opacity">👤</div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Active customers</p>
              </div>

              {/* Pending Orders */}
              <div className="group relative bg-slate-800/40 backdrop-blur-sm border border-amber-600/20 rounded-xl p-5 hover:border-amber-500/50 hover:bg-slate-800/60 transition-all duration-300 shadow-xl hover:shadow-amber-600/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">⏳ Pending</p>
                    <h3 className="text-3xl font-bold text-amber-400 mt-2">{orders.filter(o => o.paymentStatus === 'pending').length}</h3>
                  </div>
                  <div className="text-2xl opacity-20 group-hover:opacity-40 transition-opacity">⌛</div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Awaiting payment</p>
              </div>

              {/* Paid Orders */}
              <div className="group relative bg-slate-800/40 backdrop-blur-sm border border-emerald-600/20 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all duration-300 shadow-xl hover:shadow-emerald-600/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">✅ Paid</p>
                    <h3 className="text-3xl font-bold text-emerald-400 mt-2">{orders.filter(o => o.paymentStatus === 'paid').length}</h3>
                  </div>
                  <div className="text-2xl opacity-20 group-hover:opacity-40 transition-opacity">💰</div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Completed</p>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Orders */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">📋 Recent Orders</h2>
                    <p className="text-xs text-gray-500 mt-1">{filteredOrders.length} matching orders</p>
                  </div>
                  <button
                    onClick={fetchOrders}
                    className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-600/50 text-green-300 text-sm rounded-lg transition-all"
                  >
                    🔄 Refresh
                  </button>
                </div>

                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-3">
                  {loading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="text-center">
                        <div className="inline-block animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full"></div>
                        <p className="text-gray-400 mt-2">Loading orders...</p>
                      </div>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="h-40 flex items-center justify-center">
                      <p className="text-gray-500">No orders found</p>
                    </div>
                  ) : (
                    filteredOrders.map(o => {
                      const displayUser = resolveUserForOrder(o);
                      return (
                        <div
                          key={o._id}
                          onClick={() => loadOrder(o._id)}
                          className="group relative bg-slate-800/50 backdrop-blur-sm border border-green-600/20 rounded-xl p-4 hover:border-green-500/60 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-green-600/20 cursor-pointer transition-all duration-300"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-green-300 group-hover:text-green-200">{displayUser.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500 mt-1">{displayUser.email || 'N/A'}</p>
                              <p className="text-xs text-gray-600 mt-2">Order ID: {o._id}</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-lg font-bold text-green-400">₹{Number(o.total || 0).toFixed(2)}</p>
                              <p className="text-xs text-gray-500 mt-1">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap mt-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusColor(o.paymentStatus)}`}>
                              {o.paymentStatus === 'paid' ? '✅' : '⏳'} {o.paymentStatus}
                            </span>
                            <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusColor(o.status || 'pending')}`}>
                              {o.status || 'pending'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Messages & Users */}
              <div className="space-y-6">
                {/* Messages Section */}
                <div>
                  <h2 className="text-lg font-bold text-white mb-3">💬 Messages</h2>
                  <div className="space-y-2 max-h-[33vh] overflow-y-auto pr-2">
                    {messages.length === 0 ? (
                      <div className="h-24 flex items-center justify-center">
                        <p className="text-gray-500 text-sm">No messages</p>
                      </div>
                    ) : (
                      messages.map(m => (
                        <div
                          key={m._id}
                          onClick={() => loadMessage(m._id)}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${m.read ? 'bg-slate-800/30 border border-gray-700/30' : 'bg-green-600/10 border border-green-600/40'} hover:bg-slate-800/60`}
                        >
                          <p className="text-sm font-semibold text-green-300 truncate">{m.name}</p>
                          <p className="text-xs text-gray-500 truncate">{m.email || m.phone}</p>
                          <p className="text-xs text-gray-600 mt-1">{new Date(m.createdAt).toLocaleDateString('en-IN')}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Users Section */}
                <div>
                  <h2 className="text-lg font-bold text-white mb-3">👥 Users</h2>
                  <div className="space-y-2 max-h-[33vh] overflow-y-auto pr-2">
                    {users.length === 0 ? (
                      <div className="h-24 flex items-center justify-center">
                        <p className="text-gray-500 text-sm">No users</p>
                      </div>
                    ) : (
                      users.map(u => (
                        <div key={u._id} className="p-3 bg-slate-800/40 border border-blue-600/20 rounded-lg hover:border-blue-500/50 hover:bg-slate-800/60 transition-all">
                          <p className="text-sm font-semibold text-blue-300">{u.name}</p>
                          <p className="text-xs text-gray-500 truncate mt-1">{u.email}</p>
                          <span className={`inline-block text-xs px-2.5 py-1 rounded-full mt-2 ${u.role === 'admin' ? 'bg-purple-600/20 border border-purple-500/50 text-purple-300' : 'bg-blue-600/20 border border-blue-500/50 text-blue-300'}`}>
                            {u.role === 'admin' ? '👑' : '⭐'} {u.role}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Analytics Section */}
        {activeSection === 'analytics' && (
          <AnalyticsDashboard adminToken={adminToken} />
        )}

        {/* Inventory Section */}
        {activeSection === 'inventory' && (
          <InventoryManagement adminToken={adminToken} />
        )}

        {/* Marketing Section */}
        {activeSection === 'marketing' && (
          <MarketingManagement adminToken={adminToken} />
        )}

        {/* Order Detail Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}></div>
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <div className="relative bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-green-600/30 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-green-600/20 p-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-green-300">📦 Order Details</h3>
                    <p className="text-xs text-gray-500 mt-1">Order ID: {selected._id}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-3xl text-gray-400 hover:text-white transition">✕</button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Customer & Payment Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/40 border border-green-600/20 rounded-xl p-4">
                      <p className="text-xs text-gray-400 uppercase mb-2">👤 Customer</p>
                      <p className="text-lg font-semibold text-white">{(() => resolveUserForOrder(selected).name)()}</p>
                      <p className="text-sm text-gray-400 mt-1">{(() => resolveUserForOrder(selected).email)()}</p>
                    </div>
                    <div className="bg-slate-700/40 border border-green-600/20 rounded-xl p-4">
                      <p className="text-xs text-gray-400 uppercase mb-2">💳 Payment</p>
                      <p className="text-lg font-semibold text-white uppercase">{selected.paymentMethod}</p>
                      <span className={`inline-block text-xs px-2.5 py-1 rounded-full mt-2 ${getStatusColor(selected.paymentStatus)}`}>
                        {selected.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Details */}
                  <div>
                    <h4 className="text-sm font-bold text-green-300 mb-3">📍 Delivery Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-700/40 border border-green-600/20 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Full Name</p>
                        <p className="text-sm font-medium text-white">{selected.deliveryName || '—'}</p>
                      </div>
                      <div className="bg-slate-700/40 border border-green-600/20 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Phone</p>
                        <p className="text-sm font-medium text-white">{selected.deliveryPhone || '—'}</p>
                      </div>
                      <div className="bg-slate-700/40 border border-green-600/20 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="text-sm font-medium text-white truncate">{selected.deliveryEmail || '—'}</p>
                      </div>
                      <div className="bg-slate-700/40 border border-green-600/20 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">City</p>
                        <p className="text-sm font-medium text-white">{selected.deliveryLocation || '—'}</p>
                      </div>
                    </div>
                    <div className="bg-slate-700/40 border border-green-600/20 rounded-lg p-3 mt-3">
                      <p className="text-xs text-gray-500 mb-1">Address</p>
                      <p className="text-sm text-white whitespace-pre-wrap break-words">{selected.deliveryAddress || '—'}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="text-sm font-bold text-green-300 mb-3">📋 Items</h4>
                    <div className="space-y-2">
                      {selected?.items?.map(it => (
                        <div key={it.productId} className="flex justify-between items-center p-3 bg-slate-700/40 border border-green-600/20 rounded-lg">
                          <div>
                            <p className="font-medium text-white">{it.emoji} {it.name}</p>
                            <p className="text-xs text-gray-500">Qty: {it.quantity}</p>
                          </div>
                          <p className="font-semibold text-green-400">₹{Number(it.price || 0).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-green-600/20">
                    <div className="bg-slate-700/40 border border-green-600/20 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Subtotal</p>
                      <p className="text-xl font-bold text-green-400">₹{Number(selected.subtotal || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-700/40 border border-green-600/20 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Tax + Shipping</p>
                      <p className="text-xl font-bold text-green-400">₹{(Number(selected.tax || 0) + Number(selected.shipping || 0)).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-600/40 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">💰 Total Amount</p>
                    <p className="text-3xl font-bold text-green-300">₹{Number(selected.total || 0).toFixed(2)}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-2 uppercase font-medium">Update Status</p>
                      <div className="flex gap-2 flex-wrap">
                        {['processing', 'shipped'].map(status => (
                          <button
                            key={status}
                            onClick={() => updateOrder(selected._id, { status })}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm rounded-lg transition-all"
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                        <button
                          onClick={() => updateOrder(selected._id, { status: 'delivered' })}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white text-sm rounded-lg transition-all font-semibold"
                          title="Mark as Delivered & Send Invoice Email to Customer"
                        >
                          ✅ Deliver & Send Invoice
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-2 uppercase font-medium">Mark Payment</p>
                      <button
                        onClick={() => updateOrder(selected._id, { paymentStatus: 'paid' })}
                        className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium rounded-lg transition-all"
                      >
                        ✅ Mark as Paid
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMessage(null)}></div>
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <div className="relative bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-green-600/30 rounded-2xl shadow-2xl max-w-2xl w-full">
                <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-green-600/20 p-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-green-300">💬 Message</h3>
                    <p className="text-xs text-gray-500 mt-1">From: {selectedMessage.name} — {selectedMessage.email || selectedMessage.phone}</p>
                  </div>
                  <button onClick={() => setSelectedMessage(null)} className="text-3xl text-gray-400 hover:text-white transition">✕</button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="bg-slate-700/40 border border-green-600/20 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2">📅 Received</p>
                    <p className="text-sm font-medium text-white">{new Date(selectedMessage.createdAt).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="bg-slate-700/40 border border-green-600/20 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2">📝 Message</p>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{selectedMessage.message}</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => markMessageRead(selectedMessage._id, !selectedMessage.read)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium rounded-lg transition-all"
                    >
                      {selectedMessage.read ? '↩ Mark Unread' : '✅ Mark Read'}
                    </button>
                    <button
                      onClick={() => deleteMessage(selectedMessage._id)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium rounded-lg transition-all"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
