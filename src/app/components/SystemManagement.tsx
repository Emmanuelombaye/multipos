import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { toast } from 'sonner';
import { Settings, Database, Package, Users, RefreshCw, DollarSign, Calendar, Key, Trash2 } from 'lucide-react';

export const SystemManagement = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Stock management
  const [stockData, setStockData] = useState({ productId: '', quantity: 0 });
  
  // Date-based operations
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingStockData, setOpeningStockData] = useState({ productId: '', quantity: 0 });
  
  // User management
  const [selectedUser, setSelectedUser] = useState('');
  const [userUpdate, setUserUpdate] = useState({ name: '', password: '' });

  useEffect(() => {
    loadBranches();
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadProducts();
    }
  }, [selectedBranch]);

  const loadBranches = async () => {
    try {
      const data = await apiClient.getBranches();
      setBranches(data || []);
    } catch (error) {
      console.error('Failed to load branches');
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiClient.getBranchProducts(selectedBranch);
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to load products');
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiClient.getStaff();
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  // Set current stock
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
      loadProducts();
    } catch (error) {
      toast.error('Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  // Set opening stock for specific date
  const handleSetOpeningStock = async () => {
    if (!selectedBranch || !openingStockData.productId || !selectedDate) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await apiClient.recordStockEntry(
        openingStockData.productId,
        selectedBranch,
        openingStockData.quantity,
        selectedDate
      );
      toast.success(`Opening stock set for ${selectedDate}`);
      setOpeningStockData({ productId: '', quantity: 0 });
    } catch (error) {
      toast.error('Failed to set opening stock');
    } finally {
      setLoading(false);
    }
  };

  // Reset all stock to zero
  const handleResetBranchStock = async () => {
    if (!selectedBranch) {
      toast.error('Please select a branch');
      return;
    }

    if (!confirm('Reset ALL stock to zero for this branch?')) return;

    setLoading(true);
    try {
      for (const product of products) {
        await apiClient.updateBranchStock(selectedBranch, product.id, 0);
      }
      toast.success('All stock reset to zero!');
      loadProducts();
    } catch (error) {
      toast.error('Failed to reset stock');
    } finally {
      setLoading(false);
    }
  };

  // Update user details
  const handleUpdateUser = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    if (!userUpdate.name && !userUpdate.password) {
      toast.error('Please enter name or password to update');
      return;
    }

    setLoading(true);
    try {
      // Note: You'll need to add this endpoint to your backend
      const updates: any = {};
      if (userUpdate.name) updates.name = userUpdate.name;
      if (userUpdate.password) updates.password = userUpdate.password;
      
      await apiClient.axios.put(`/staff/${selectedUser}`, updates);
      toast.success('User updated successfully!');
      setUserUpdate({ name: '', password: '' });
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-red-700" />
          <h1 className="text-2xl font-bold">System Management</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'stock' ? 'border-red-700 text-red-700' : 'border-transparent text-gray-600'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Stock Management
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-red-700 text-red-700' : 'border-transparent text-gray-600'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Historical Data
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-red-700 text-red-700' : 'border-transparent text-gray-600'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            User Management
          </button>
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

        {/* Stock Management Tab */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            {/* Set Current Stock */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Set Current Stock</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product</label>
                  <select
                    value={stockData.productId}
                    onChange={(e) => setStockData({...stockData, productId: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Current: {product.current_stock || 0} kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">New Quantity (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stockData.quantity}
                    onChange={(e) => setStockData({...stockData, quantity: parseFloat(e.target.value) || 0})}
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

            {/* Reset Stock */}
            <div className="border rounded-lg p-6 bg-red-50">
              <h2 className="text-xl font-semibold mb-4 text-red-700">Danger Zone</h2>
              <p className="text-sm text-gray-600 mb-4">
                Reset ALL products in the selected branch to zero stock.
              </p>
              <button
                onClick={handleResetBranchStock}
                disabled={loading || !selectedBranch}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset All Stock to Zero'}
              </button>
            </div>
          </div>
        )}

        {/* Historical Data Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Set Opening Stock for Date</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Product</label>
                  <select
                    value={openingStockData.productId}
                    onChange={(e) => setOpeningStockData({...openingStockData, productId: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Opening Stock (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingStockData.quantity}
                    onChange={(e) => setOpeningStockData({...openingStockData, quantity: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <button
                  onClick={handleSetOpeningStock}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Setting...' : 'Set Opening Stock'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Update User Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select User</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => {
                      setSelectedUser(e.target.value);
                      const user = users.find(u => u.id === e.target.value);
                      if (user) setUserUpdate({ name: user.name, password: '' });
                    }}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">-- Select User --</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {user.role}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUser && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">New Name</label>
                      <input
                        type="text"
                        value={userUpdate.name}
                        onChange={(e) => setUserUpdate({...userUpdate, name: e.target.value})}
                        placeholder="Enter new name"
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">New Password</label>
                      <input
                        type="password"
                        value={userUpdate.password}
                        onChange={(e) => setUserUpdate({...userUpdate, password: e.target.value})}
                        placeholder="Enter new password (leave empty to keep current)"
                        className="w-full p-3 border rounded-lg"
                      />
                    </div>

                    <button
                      onClick={handleUpdateUser}
                      disabled={loading}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update User'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* User List */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">All Users</h2>
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email} • {user.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
