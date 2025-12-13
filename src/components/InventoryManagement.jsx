import React, { useState, useEffect } from 'react';

/**
 * Inventory Management Component
 * Track stock levels, set alerts, manage reorders
 */

const API_BASE = 'https://newplant-9.onrender.com';

const InventoryManagement = ({ adminToken }) => {
  const [products, setProducts] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newStock, setNewStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  // Add product form state
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addStock, setAddStock] = useState('');
  const [addCategory, setAddCategory] = useState('');

  // Fetch products with stock info
  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Try to fetch plants from server admin endpoint (requires admin token)
      const response = await fetch(`${API_BASE}/api/admin/plants`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }).catch(() => null);

      let data = [];

      if (response && response.ok) {
        const result = await response.json();
        // server returns { success: true, plants: [...] }
        const plants = result.plants || [];
        console.log('Fetched plants from server:', plants.length, plants.slice(0, 2)); // Debug log
        // map plants to inventory product shape - use stock directly from DB
        data = plants.map(p => ({
          _id: p._id,
          name: p.name,
          price: p.salePrice || p.price || 0,
          stock: Number(p.stock) || 0, // use stock from DB, default to 0 if missing
          category: p.category || 'uncategorized',
          imageUrl: p.imageUrl || ''
        }));
        console.log('Mapped products:', data.slice(0, 2)); // Debug log
      } else {
        console.warn('Failed to fetch from API or response not ok');
        // Fallback to mock data for testing or when server unavailable
        data = [
          { _id: '1', name: 'Monstera Plant', price: 500, stock: 10 },
          { _id: '2', name: 'Rose Kit', price: 900, stock: 10 },
          { _id: '3', name: 'Planter', price: 800, stock: 10 },
          { _id: '4', name: 'Flowering Plant', price: 600, stock: 10 },
          { _id: '5', name: 'Succulent Mix', price: 400, stock: 10 },
        ];
      }

      setProducts(data);

      // Filter low stock items
      const low = data.filter(p => (p.stock || 0) < lowStockThreshold);
      setLowStockItems(low);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Use mock data on error instead of alert
      const mockData = [
        { _id: '1', name: 'Monstera Plant', price: 500, stock: 10 },
        { _id: '2', name: 'Rose Kit', price: 900, stock: 10 },
        { _id: '3', name: 'Planter', price: 800, stock: 10 },
      ];
      setProducts(mockData);
      const low = mockData.filter(p => (p.stock || 0) < lowStockThreshold);
      setLowStockItems(low);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchProducts();
    }
  }, [adminToken, lowStockThreshold]);

  // Update stock
  const handleStockUpdate = async (productId) => {
    if (!newStock || isNaN(newStock)) {
      alert('Enter a valid stock number');
      return;
    }
    // Update locally first so UI is responsive
    const parsed = parseInt(newStock, 10);
    setProducts(prev => prev.map(p => p._id === productId ? { ...p, stock: parsed } : p));
    setLowStockItems(prev => {
      // recalc from updated products
      const all = products.map(p => p._id === productId ? { ...p, stock: parsed } : p);
      return all.filter(p => (p.stock || 0) < lowStockThreshold);
    });
    setEditingProduct(null);
    setNewStock('');
    alert('Stock updated locally');

    // Optionally attempt to persist to server (best-effort). Server Plant model doesn't include `stock` by default,
    // so this call may be ignored by the API. We still attempt to call the admin update endpoint.
    try {
      if (adminToken) {
        await fetch(`${API_BASE}/api/admin/plants/${productId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ stock: parsed })
        });
      }
    } catch (err) {
      console.warn('Server stock update attempt failed (non-blocking)', err);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-lg text-white">
        <h2 className="text-2xl font-bold mb-2">📦 Inventory Management</h2>
        <p className="text-blue-100">Track stock levels and manage product inventory</p>
      </div>

      {/* Alert Box */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <h3 className="text-red-700 font-bold mb-2">⚠️ Low Stock Alert</h3>
          <p className="text-red-600 mb-3">{lowStockItems.length} products have stock below {lowStockThreshold} units</p>
          <ul className="space-y-1">
            {lowStockItems.slice(0, 5).map(item => (
              <li key={item._id} className="text-sm text-red-600">
                • {item.name}: {item.stock || 0} units left
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
          <input
            type="number"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Demo / Add Products Controls */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Inline Add Product Form */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <input
              type="text"
              placeholder="Product Name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-gray-900"
            />
            <input
              type="number"
              placeholder="Price"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-gray-900"
            />
            <input
              type="number"
              placeholder="Stock"
              value={addStock}
              onChange={(e) => setAddStock(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-gray-900"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Category"
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-gray-900 w-full"
              />
              <button
                onClick={() => {
                  if (!addName) { alert('Enter product name'); return; }
                  const newProduct = {
                    _id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    name: addName,
                    price: Number(addPrice) || 0,
                    stock: Number(addStock) || 0,
                    category: addCategory || 'Uncategorized',
                  };
                  setProducts(prev => {
                    const all = [newProduct, ...prev];
                    setLowStockItems(all.filter(p => (p.stock || 0) < lowStockThreshold));
                    return all;
                  });
                  // reset form
                  setAddName(''); setAddPrice(''); setAddStock(''); setAddCategory('');
                }}
                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Product Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Current Stock</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map(product => {
              const stock = product.stock || 0;
              const isLow = stock < lowStockThreshold;
              const isEditing = editingProduct === product._id;

              return (
                <tr key={product._id} className={isLow ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{product.name}</td>
                  <td className="px-6 py-4 text-sm">
                    {isEditing ? (
                      <input
                        type="number"
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded"
                        autoFocus
                      />
                    ) : (
                      <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                        {stock} units
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">₹{product.price}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stock === 0 ? 'bg-red-100 text-red-700' :
                      isLow ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                      {stock === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStockUpdate(product._id)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(null);
                            setNewStock('');
                          }}
                          className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500 text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingProduct(product._id);
                          setNewStock(stock.toString());
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit Stock
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Products</p>
          <p className="text-2xl font-bold text-blue-600">{products.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">In Stock</p>
          <p className="text-2xl font-bold text-green-600">
            {products.filter(p => (p.stock || 0) > 0).length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">
            {products.filter(p => (p.stock || 0) === 0).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
