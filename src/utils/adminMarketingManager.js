/**
 * Admin Discount & Promo Code Manager
 * Create, manage, and track promotional codes
 */

const API_BASE = 'https://newplant-9.onrender.com';

export const discountManager = {
  // Get all discount codes
  async getDiscounts(token) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/discounts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => null);

      if (response && response.ok) {
        return await response.json();
      }

      // Mock data for testing
      return [
        {
          _id: '1',
          code: 'SUMMER20',
          type: 'percentage',
          value: 20,
          maxUses: 100,
          usedCount: 45,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          minOrderValue: 500,
          isActive: true,
        },
        {
          _id: '2',
          code: 'FLAT100',
          type: 'fixed',
          value: 100,
          maxUses: 50,
          usedCount: 28,
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          minOrderValue: 1000,
          isActive: true,
        },
        {
          _id: '3',
          code: 'WELCOME10',
          type: 'percentage',
          value: 10,
          maxUses: 200,
          usedCount: 150,
          expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          minOrderValue: 0,
          isActive: true,
        },
      ];
    } catch (error) {
      console.error('Discount fetch error:', error);
      // Return mock data on error
      return [
        { _id: '1', code: 'SUMMER20', type: 'percentage', value: 20, maxUses: 100, usedCount: 45 },
        { _id: '2', code: 'FLAT100', type: 'fixed', value: 100, maxUses: 50, usedCount: 28 },
      ];
    }
  },

  // Create new discount code
  async createDiscount(discountData, token) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/discounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: discountData.code,
          type: discountData.type, // 'percentage' or 'fixed'
          value: discountData.value,
          maxUses: discountData.maxUses,
          usedCount: 0,
          expiryDate: discountData.expiryDate,
          minOrderValue: discountData.minOrderValue || 0,
          applicableProducts: discountData.applicableProducts || [],
          isActive: true,
          createdAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to create discount');
      return await response.json();
    } catch (error) {
      console.error('Discount creation error:', error);
      throw error;
    }
  },

  // Update discount code
  async updateDiscount(discountId, updates, token) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/discounts/${discountId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update discount');
      return await response.json();
    } catch (error) {
      console.error('Discount update error:', error);
      throw error;
    }
  },

  // Delete discount code
  async deleteDiscount(discountId, token) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/discounts/${discountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete discount');
      return true;
    } catch (error) {
      console.error('Discount deletion error:', error);
      throw error;
    }
  },

  // Validate discount code
  async validateDiscount(code, orderTotal = 0) {
    try {
      const response = await fetch(`${API_BASE}/api/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderTotal }),
      });
      if (!response.ok) throw new Error('Invalid discount code');
      return await response.json();
    } catch (error) {
      console.error('Discount validation error:', error);
      throw error;
    }
  },

  // Get discount usage stats
  getUsageStats(discount) {
    const remaining = discount.maxUses - (discount.usedCount || 0);
    const usagePercentage = (discount.usedCount / discount.maxUses) * 100;
    const daysLeft = discount.expiryDate ? Math.ceil((new Date(discount.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    return {
      used: discount.usedCount || 0,
      remaining,
      usagePercentage,
      daysLeft,
      isExpired: daysLeft !== null && daysLeft <= 0,
      isAlmostUsed: usagePercentage >= 80,
    };
  },

  // Generate random code
  generateCode(prefix = 'PROMO', length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix;
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },
};

// Email campaign manager
export const emailCampaignManager = {
  async sendCampaign(campaignData, token) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/campaigns/email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignData.name,
          subject: campaignData.subject,
          template: campaignData.template,
          recipientSegment: campaignData.recipientSegment, // 'all', 'new', 'inactive', 'vip'
          scheduledTime: campaignData.scheduledTime || new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to send campaign');
      return await response.json();
    } catch (error) {
      console.error('Campaign send error:', error);
      throw error;
    }
  },

  async getCampaigns(token) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => null);

      if (response && response.ok) {
        return await response.json();
      }

      // Mock data for testing
      return [
        {
          _id: '1',
          name: 'Summer Sale Campaign',
          subject: 'Special Summer Offers Inside!',
          template: 'summer_2024',
          recipientSegment: 'all',
          sentCount: 2500,
          openRate: 32.5,
          clickRate: 8.2,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: '2',
          name: 'New Product Launch',
          subject: 'Introducing Our New Flowering Plant Collection',
          template: 'new_products',
          recipientSegment: 'vip',
          sentCount: 1200,
          openRate: 45.3,
          clickRate: 12.7,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: '3',
          name: 'Abandoned Cart Reminder',
          subject: 'Don\'t forget your plants!',
          template: 'abandoned_cart',
          recipientSegment: 'inactive',
          sentCount: 890,
          openRate: 28.1,
          clickRate: 6.5,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
    } catch (error) {
      console.error('Campaigns fetch error:', error);
      return [
        { _id: '1', name: 'Summer Sale Campaign', openRate: 32.5, clickRate: 8.2 },
      ];
    }
  },
};

// Featured products manager
export const featuredProductsManager = {
  async getFeaturedProducts(token) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/featured-products`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => null);

      if (response && response.ok) {
        return await response.json();
      }

      // Mock data for testing
      return [
        {
          _id: '1',
          name: 'Monstera Deliciosa',
          price: 850,
          category: 'Indoor Plants',
          sales: 245,
          rating: 4.8,
          image: 'monstera.jpg',
        },
        {
          _id: '2',
          name: 'Premium Rose Kit',
          price: 1200,
          category: 'Flowering Plants',
          sales: 187,
          rating: 4.9,
          image: 'rose-kit.jpg',
        },
        {
          _id: '3',
          name: 'Decorative Planter',
          price: 650,
          category: 'Planters & Pots',
          sales: 512,
          rating: 4.7,
          image: 'planter.jpg',
        },
        {
          _id: '4',
          name: 'Plant Care Kit',
          price: 450,
          category: 'Care Kits',
          sales: 324,
          rating: 4.6,
          image: 'care-kit.jpg',
        },
      ];
    } catch (error) {
      console.error('Featured products fetch error:', error);
      return [
        { _id: '1', name: 'Monstera Deliciosa', price: 850, sales: 245, rating: 4.8 },
      ];
    }
  },

  async setFeatured(productId, isFeatured, token) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/featured-products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFeatured }),
      });
      if (!response.ok) throw new Error('Failed to update featured product');
      return await response.json();
    } catch (error) {
      console.error('Featured product update error:', error);
      throw error;
    }
  },
};
