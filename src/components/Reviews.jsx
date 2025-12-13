import React from "react";

const API_BASE = 'https://newplant-7.onrender.com';

const Reviews = () => {
  const [reviews, setReviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function fetchReviews() {
      try {
        const resp = await fetch(`${API_BASE}/api/reviews?limit=20`);
        const data = await resp.json();
        if (mounted && data.success && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      } catch (err) {
        console.error('Failed to load reviews', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchReviews();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="px-0 py-20 bg-gradient-to-b from-green-950/10 to-transparent">
      <div className="max-w-full mx-auto px-8">
        <h2 className="text-center text-4xl md:text-5xl font-bold mb-4">
          <span className="text-green-400">💬 Customer</span> Reviews
        </h2>
        <p className="text-center text-gray-400 mb-12">See what our happy customers have to say!</p>

        {loading ? (
          <div className="text-center text-gray-400 mb-12">Loading reviews…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {reviews.map((review) => (
              <div key={review.id} className="bg-gradient-to-br from-green-900/20 to-black/40 border border-green-700 p-8 rounded-2xl backdrop-blur-md hover:border-green-500 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-green-800 flex items-center justify-center text-2xl">
                    {review.avatar ? (
                      <img src={review.avatar} alt={review.name || 'User'} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <span>👩‍🌾</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{review.name}</h3>
                      {review.verified && <span className="text-xs bg-green-600 px-2 py-1 rounded text-white">✓ Verified</span>}
                    </div>
                    <div className="text-yellow-400 mb-2">{'⭐'.repeat(Math.max(1, Math.min(5, review.rating || 5)))}</div>
                    <p className="text-gray-200 leading-relaxed">"{review.text}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats (static placeholders) */}
        <div className="grid grid-cols-3 gap-6 text-center bg-green-900/20 border border-green-700 rounded-2xl p-8">
          <div>
            <p className="text-4xl font-bold text-green-400">4.8⭐</p>
            <p className="text-gray-300 mt-2">Average Rating</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-green-400">2,500+</p>
            <p className="text-gray-300 mt-2">Happy Customers</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-green-400">98%</p>
            <p className="text-gray-300 mt-2">Recommend Us</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
