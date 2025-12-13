import React, { useState, useEffect } from "react";

const SearchModal = ({ showSearch, setShowSearch, setCurrentPage, addToCart }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPlants, setFilteredPlants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = "https://newplant-8.onrender.com";

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPlants([]);
      setError(null);
      return;
    }

    // debounce
    const t = setTimeout(() => {
      (async () => {
        try {
          setLoading(true);
          setError(null);
          const q = encodeURIComponent(searchTerm.trim());
          const resp = await fetch(`${API_BASE}/api/plants/search/${q}`);
          const data = await resp.json();
          if (data && data.success) {
            setFilteredPlants(data.plants || []);
          } else {
            setFilteredPlants([]);
            setError(data?.message || 'No results');
          }
        } catch (err) {
          console.error('Search error', err);
          setError('Search failed');
          setFilteredPlants([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(t);
  }, [searchTerm]);

  const handleClose = () => {
    setShowSearch(false);
    setSearchTerm("");
    setFilteredPlants([]);
    setError(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      // explicit search already handled by debounce/effect
    }
  };

  return (
    <>
      {showSearch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-2xl bg-[#071018] border-2 border-green-600 rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-4 p-6 bg-green-900/20 border-b border-green-700">
              <input
                type="text"
                placeholder="🔍 Search plants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
                className="flex-1 px-4 py-3 bg-[#0b2a1a] border border-green-600 rounded-lg text-white outline-none focus:border-green-400 text-lg"
              />
              <button
                onClick={handleClose}
                className="text-3xl text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {searchTerm && (
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {loading && (
                  <div className="text-center py-6 text-gray-400">Searching...</div>
                )}

                {!loading && error && (
                  <div className="text-center py-6 text-gray-400">{error}</div>
                )}

                {!loading && !error && filteredPlants.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-2xl mb-2">🔍</p>
                    <p>No plants found for "{searchTerm}"</p>
                  </div>
                )}

                {!loading && filteredPlants.length > 0 && (
                  filteredPlants.map((plant) => (
                    <div key={plant._id || plant.id} className="w-full text-left px-4 py-3 hover:bg-green-900/30 border border-green-700/50 rounded-lg transition flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🌿</span>
                        <div>
                          <p className="font-bold">{plant.name}</p>
                          <p className="text-sm text-gray-400">₹{plant.salePrice ?? plant.price ?? ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
                          // add to cart (if addToCart provided)
                          if (addToCart) {
                            const price = (plant.salePrice ?? plant.price) || 0;
                            addToCart({ id: plant._id || plant.id, name: plant.name, price, image: plant.imageUrl, currency: 'INR' });
                          }
                        }} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg">Add</button>
                        <button onClick={() => {
                          setCurrentPage?.('indoreplants');
                          handleClose();
                        }} className="px-3 py-1 border border-green-600 text-green-300 rounded-lg">Go to collection</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {!searchTerm && (
              <div className="p-6 text-center text-gray-400">
                <p className="text-lg">Start typing to search...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SearchModal;
