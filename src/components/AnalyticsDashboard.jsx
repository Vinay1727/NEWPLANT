import React, { useState, useEffect } from 'react';

/**
 * Real Analytics Dashboard Component
 * Fetches live data from server analytics endpoint
 */

const API_BASE = 'https://newplant-9.onrender.com';

const AnalyticsDashboard = ({ adminToken }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch real analytics from server
  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data);
      } else {
        setError(data.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAnalytics();
      // Refresh every 30 seconds
      const interval = setInterval(fetchAnalytics, 30000);
      return () => clearInterval(interval);
    }
  }, [adminToken]);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mb-3"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-300">
        <p className="font-semibold">Error: {error}</p>
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-gray-400">No analytics data available</div>;
  }

  const { summary, ordersByStatus, paymentsByStatus, topProducts, revenueByMethod, dailyOrders, lowStockItems, productsByCategory } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-1">📊 Analytics & Reports</h2>
            <p className="text-blue-100">Real-time data from your store</p>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-green-600/30 rounded-xl p-5 hover:border-green-500/50 transition">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Orders</p>
          <p className="text-3xl font-bold text-white mt-2">{summary?.totalOrders || 0}</p>
          <p className="text-xs text-gray-500 mt-2">📦 Transactions</p>
        </div>
        <div className="bg-slate-800/50 border border-emerald-600/30 rounded-xl p-5 hover:border-emerald-500/50 transition">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Revenue</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">₹{Number(summary?.totalRevenue || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">💰 Total earned</p>
        </div>
        <div className="bg-slate-800/50 border border-blue-600/30 rounded-xl p-5 hover:border-blue-500/50 transition">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Users</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">{summary?.totalUsers || 0}</p>
          <p className="text-xs text-gray-500 mt-2">👥 Active customers</p>
        </div>
        <div className="bg-slate-800/50 border border-purple-600/30 rounded-xl p-5 hover:border-purple-500/50 transition">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Products</p>
          <p className="text-3xl font-bold text-purple-400 mt-2">{summary?.totalProducts || 0}</p>
          <p className="text-xs text-gray-500 mt-2">🌿 In inventory</p>
        </div>
      </div>

      {/* Order & Payment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status */}
        <div className="bg-slate-800/40 border border-green-600/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">📈 Order Status</h3>
          <div className="space-y-4">
            {ordersByStatus?.map(item => (
              <div key={item._id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300 capitalize font-medium">{item._id || 'Unknown'}</span>
                  <span className="text-sm font-bold text-green-400">{item.count}</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full"
                    style={{ width: `${Math.min(100, (item.count / (summary?.totalOrders || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-slate-800/40 border border-blue-600/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">💳 Payment Status</h3>
          <div className="space-y-4">
            {paymentsByStatus?.map(item => (
              <div key={item._id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300 capitalize font-medium">{item._id || 'Unknown'}</span>
                  <span className="text-sm font-bold text-blue-400">{item.count}</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${item._id === 'paid' ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                      item._id === 'pending' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                    style={{ width: `${Math.min(100, (item.count / (summary?.totalOrders || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      {topProducts && topProducts.length > 0 && (
        <div className="bg-slate-800/40 border border-purple-600/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">🏆 Top Selling Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Product</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Qty Sold</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {topProducts.map((product, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-white font-medium">{product._id || 'Unknown'}</td>
                    <td className="py-3 px-4 text-right text-purple-300">{product.totalQuantity}</td>
                    <td className="py-3 px-4 text-right text-emerald-300 font-semibold">₹{Number(product.totalRevenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue by Payment Method */}
      {revenueByMethod && revenueByMethod.length > 0 && (
        <div className="bg-slate-800/40 border border-emerald-600/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">💰 Revenue by Payment Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {revenueByMethod.map(method => (
              <div key={method._id} className="bg-slate-800/60 border border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide capitalize">{method._id || 'Unknown'}</p>
                <p className="text-2xl font-bold text-emerald-400 mt-2">₹{Number(method.revenue || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">{method.count} transaction{method.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-red-300 mb-4">⚠️ Low Stock Alert</h3>
          <p className="text-sm text-red-200 mb-4">{lowStockItems.length} product(s) have stock below 5 units</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowStockItems.slice(0, 6).map(item => (
              <div key={item._id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <p className="font-medium text-red-300">{item.name}</p>
                <p className="text-sm text-red-200">Stock: <span className="font-bold">{item.stock}</span> units</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Categories */}
      {productsByCategory && productsByCategory.length > 0 && (
        <div className="bg-slate-800/40 border border-blue-600/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">📂 Products by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productsByCategory.map(category => (
              <div key={category._id} className="bg-slate-800/60 border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400 uppercase tracking-wide capitalize">{category._id || 'Uncategorized'}</p>
                <p className="text-2xl font-bold text-blue-400 mt-2">{category.count}</p>
                <p className="text-xs text-gray-500 mt-2">Total Stock: <span className="font-semibold text-blue-300">{category.totalStock}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Orders Trend */}
      {dailyOrders && dailyOrders.length > 0 && (
        <div className="bg-slate-800/40 border border-indigo-600/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">📅 Daily Order Trend (Last 30 Days)</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {dailyOrders.slice(-7).map(day => (
              <div key={day._id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">{day._id}</span>
                  <span className="text-xs font-bold text-indigo-300">{day.count} orders • ₹{Number(day.revenue || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (day.count / 10) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Reports Section */}
      <div className="bg-slate-800/40 border border-green-600/20 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">📥 Download Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              // Export Analytics Summary as JSON
              const data = {
                exportedAt: new Date().toISOString(),
                ...analytics
              };
              const json = JSON.stringify(data, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
          >
            📊 Analytics JSON
          </button>

          <button
            onClick={() => {
              // Export as CSV
              let csv = 'Analytics Report\n';
              csv += `Generated: ${new Date().toLocaleString()}\n\n`;
              csv += 'SUMMARY\n';
              csv += `Total Orders,${analytics.summary.totalOrders}\n`;
              csv += `Total Revenue,₹${Number(analytics.summary.totalRevenue).toLocaleString()}\n`;
              csv += `Total Users,${analytics.summary.totalUsers}\n`;
              csv += `Total Products,${analytics.summary.totalProducts}\n\n`;

              csv += 'TOP PRODUCTS\n';
              csv += 'Product Name,Quantity Sold,Revenue\n';
              analytics.topProducts?.forEach(p => {
                csv += `"${p._id}",${p.totalQuantity},₹${Number(p.totalRevenue).toLocaleString()}\n`;
              });

              csv += '\nORDER STATUS\n';
              csv += 'Status,Count\n';
              analytics.ordersByStatus?.forEach(s => {
                csv += `${s._id},${s.count}\n`;
              });

              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
          >
            📄 Export CSV
          </button>

          <button
            onClick={() => {
              // Print Report
              const printWindow = window.open('', '', 'height=600,width=800');
              const html = `
                <html>
                  <head>
                    <title>Analytics Report</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 20px; }
                      h1 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
                      h2 { color: #0066cc; margin-top: 20px; }
                      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                      th { background: #0066cc; color: white; padding: 8px; text-align: left; }
                      td { border: 1px solid #ddd; padding: 8px; }
                      tr:nth-child(even) { background: #f9f9f9; }
                      .stat { display: inline-block; margin-right: 20px; }
                      .stat-value { font-size: 24px; font-weight: bold; color: #0066cc; }
                      .stat-label { font-size: 12px; color: #666; }
                    </style>
                  </head>
                  <body>
                    <h1>📊 Analytics & Reports</h1>
                    <p>Generated: ${new Date().toLocaleString()}</p>

                    <h2>Summary</h2>
                    <div class="stat">
                      <div class="stat-value">${analytics.summary.totalOrders}</div>
                      <div class="stat-label">Total Orders</div>
                    </div>
                    <div class="stat">
                      <div class="stat-value">₹${Number(analytics.summary.totalRevenue).toLocaleString()}</div>
                      <div class="stat-label">Total Revenue</div>
                    </div>
                    <div class="stat">
                      <div class="stat-value">${analytics.summary.totalUsers}</div>
                      <div class="stat-label">Users</div>
                    </div>
                    <div class="stat">
                      <div class="stat-value">${analytics.summary.totalProducts}</div>
                      <div class="stat-label">Products</div>
                    </div>

                    <h2>Top Products</h2>
                    <table>
                      <tr>
                        <th>Product</th>
                        <th>Qty Sold</th>
                        <th>Revenue</th>
                      </tr>
                      ${analytics.topProducts?.map(p => `
                        <tr>
                          <td>${p._id}</td>
                          <td>${p.totalQuantity}</td>
                          <td>₹${Number(p.totalRevenue).toLocaleString()}</td>
                        </tr>
                      `).join('')}
                    </table>

                    <h2>Order Status</h2>
                    <table>
                      <tr>
                        <th>Status</th>
                        <th>Count</th>
                      </tr>
                      ${analytics.ordersByStatus?.map(s => `
                        <tr>
                          <td>${s._id}</td>
                          <td>${s.count}</td>
                        </tr>
                      `).join('')}
                    </table>
                  </body>
                </html>
              `;
              printWindow.document.write(html);
              printWindow.document.close();
              printWindow.print();
            }}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
          >
            🖨️ Print Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
