import React, { useState, useEffect } from "react";
import Product from "./Product";
import { formatINRFromUSD } from "../utils/priceUtils";

const API_BASE = "https://newplant-4.onrender.com";

const PlantersAndPots = ({ addToCart }) => {
  const [plants, setPlants] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlantersAndPots();
  }, []);

  const fetchPlantersAndPots = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/plants/planters`);
      const data = await response.json();
      
      if (data.success) {
        setPlants(data.plants);
        setError(null);
      } else {
        setError("Failed to load planters and pots");
      }
    } catch (err) {
      console.error("Error fetching planters:", err);
      setError("Error loading planters and pots");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen px-0 py-16 bg-gradient-to-b from-transparent to-green-950/10">
      <div className="max-w-full mx-auto px-8">
        <div className="mb-12 text-center">
          <h2 className="text-5xl font-bold mb-4">🪴 Planters & Pots Collection</h2>
          <p className="text-xl text-gray-300 mb-2">Stylish containers for your plants</p>
          <p className="text-gray-400">Add elegance to your indoor & outdoor spaces</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-300">Loading planters & pots...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12 bg-red-900/20 border border-red-700 rounded-lg p-6">
            <p className="text-red-400 text-lg">{error}</p>
            <button 
              onClick={fetchPlantersAndPots}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && plants.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No planters & pots available at the moment</p>
          </div>
        )}

        {!loading && !error && plants.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {plants.map((p) => (
              <div 
                key={p._id} 
                onClick={() => setSelectedProduct(p)}
                className="bg-gradient-to-br from-green-900/20 to-black/40 border border-green-700 p-6 rounded-2xl backdrop-blur-md hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 transition duration-300 cursor-pointer transform hover:-translate-y-1 group relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition pointer-events-none" style={{
                  backgroundImage: "radial-gradient(circle, #22c55e 1px, transparent 1px)",
                  backgroundSize: "25px 25px"
                }}></div>
                
                {p.imageUrl && (
                  <div className="w-full h-32 mb-4 rounded-lg overflow-hidden bg-gray-700 relative z-10">
                    <img 
                      src={p.imageUrl} 
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition transform"
                    />
                  </div>
                )}
                
                <h3 className="text-xl font-bold mb-2 h-12 flex items-center relative z-10">{p.name}</h3>
                
                {p.description && (
                  <p className="text-gray-300 mb-4 text-sm h-20 overflow-hidden line-clamp-3 relative z-10">
                    {p.description.replace(/<[^>]*>/g, '')}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-green-700/30 relative z-10">
                  <div>
                    <p className="text-green-400 font-bold text-lg">₹{p.salePrice}</p>
                    {p.oldPrice && (
                      <p className="text-gray-500 line-through text-sm">₹{p.oldPrice}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); addToCart({ 
                      id: p._id, 
                      name: p.name, 
                      price: p.salePrice,
                      currency: 'INR',
                      image: p.imageUrl 
                    });}}
                    className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
            <div className="relative w-full max-w-4xl mx-auto overflow-auto" style={{ maxHeight: '90vh' }}>
              <div className="rounded-lg overflow-hidden">
                <Product product={selectedProduct} addToCart={addToCart} onClose={() => setSelectedProduct(null)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PlantersAndPots;
