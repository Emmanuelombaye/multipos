import { useState } from 'react';
import { apiClient } from '../api/client';
import { toast } from 'sonner';
import { Settings, Database, Package, Users, RefreshCw } from 'lucide-react';

export const SystemManagement = () => {
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [stockData, setStockData] = useState({ productId: '', quantity: 0 });

  useState(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    const data = await apiClient.getBranches();
    setBranches(data);
  };

  const handleSetStock = async () => {
    if (!selectedBranch || !stockData.productId || stockData.quantity < 0) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await apiClient.updateBranchStock(selectedBranch, stockData.productId, stockData.quantity);
      toast.success('Stock updated successfully!');
      setStockData({ productId: '', quantity: 0 });
    } catch (error) {
      toast.error('Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const handleResetBranchStock = async () => {
    if (!selectedBranch) {
      toast.error('Please select a branch');
      return;
    }

    if (!confirm('Reset ALL stock to zero for this branch?')) return;

    setLoading(true);
    try {
      // Get all products for branch
      const products = await apiClient.getBranchProducts(selectedBranch);
      
      // Set each to zero
      for (const product of products) {
        await apiClient.updateBranchStock(selectedBranch, product.id, 0);
      }
      
      toast.success('All stock reset to zero!');
    } catch (error) {
      toast.error('Failed to reset stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-red-700" />
          <h1 className="text-2xl font-bold">System Management</h1>
        </div>

        {/* Branch Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Branch</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="">-- Select Branch --</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>

        {/* Set Stock Section */}
        <div className="border-t pt-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Set Product Stock</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product ID</label>
              <input
                type="text"
                value={stockData.productId}
                onChange={(e) => setStockData({...stockData, productId: e.target.value})}
                placeholder="Enter product ID"
                className="w-full p-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantity (kg)</label>
              <input
                type="number"
                value={stockData.quantity}
                onChange={(e) => setStockData({...stockData, quantity: parseFloat(e.target.value)})}
                placeholder="Enter quantity"
                className="w-full p-3 border rounded-lg"
              />
            </div>

            <button
              onClick={handleSetStock}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Set Stock'}
            </button>
          </div>
        </div>

        {/* Reset Stock Section */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold">Reset Branch Stock</h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            This will set ALL products in the selected branch to zero stock.
          </p>

          <button
            onClick={handleResetBranchStock}
            disabled={loading || !selectedBranch}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset All Stock to Zero'}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => window.location.href = '/products'}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <Package className="w-6 h-6 mb-2 text-green-600" />
              <div className="font-medium">Manage Products</div>
              <div className="text-sm text-gray-600">Add, edit, delete products</div>
            </button>

            <button
              onClick={() => window.location.href = '/branches'}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <Users className="w-6 h-6 mb-2 text-purple-600" />
              <div className="font-medium">Manage Branches</div>
              <div className="text-sm text-gray-600">View branch details</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
