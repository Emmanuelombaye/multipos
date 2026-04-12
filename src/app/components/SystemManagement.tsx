import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { toast } from 'sonner';
import { Settings, Package, Users, Calendar, Trash2, Edit, Plus } from 'lucide-react';

export const SystemManagement = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  
  // Stock management
  const [stockData, setStockData] = useState({ productId: '', quantity: 0 });
  
  // Historical data
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyEdit, setHistoryEdit] = useState({ id: '', openingStock: 0, closingStock: 0, date: '' });
  
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
      if (activeTab === 'history') {
        loadStockHistory();
      }
    }
  }, [selectedBranch, activeTab]);

  const loadBranches = async () => {
    try {
      const data = await apiClient.getBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load branches');
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiClient.getBranchProducts(selectedBranch);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load products');
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiClient.getStaff();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const loadStockHistory = async () => {
    try {
      const response = await apiClient.getStockHistory(selectedBranch, 100, 0);
      setStockHistory(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load stock history');
    }
  };

  // CREATE: Set current stock
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

  // CREATE: Add opening stock for date
  const handleAddHistoryEntry = async () => {
    if (!selectedBranch || !stockData.productId || !selectedDate) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await apiClient.recordStockEntry(
        stockData.productId,
        selectedBranch,
        stockData.quantity,
        selectedDate
      );
      toast.success(`Opening stock added for ${selectedDate}`);
      setStockData({ productId: '', quantity: 0 });
      loadStockHistory();
    } catch (error) {
      toast.error('Failed to add stock entry');
    } finally {
      setLoading(false);
    }
  };

  // UPDATE: Edit stock history entry
  const handleUpdateHistory = async () => {
    if (!historyEdit.id) {
      toast.error('No entry selected');
      return;
    }

    setLoading(true);
    try {
      await apiClient.updateStockHistory(historyEdit.id, {
        openingStock: historyEdit.openingStock,
        closingStock: historyEdit.closingStock,
        date: historyEdit.date
      });
      toast.success('History entry updated!');
      setHistoryEdit({ id: '', openingStock: 0, closingStock: 0, date: '' });
      loadStockHistory();
    } catch (error) {
      toast.error('Failed to update history');
    } finally {
      setLoading(false);
    }
  };

  // DELETE: Remove stock history entry
  const handleDeleteHistory = async (id: string) => {
    if (!confirm('Delete this stock history entry?')) return;

    setLoading(true);
    try {
      await apiClient.deleteStockHistory(id);
      toast.success('History entry deleted!');
      loadStockHistory();
    } catch (error) {
      toast.error('Failed to delete history');
    } finally {
      setLoading(false);
    }
  };

  // DELETE: Reset all stock to zero
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

  // UPDATE: Update user
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

  // DELETE: Remove user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user permanently?')) return;

    setLoading(true);
    try {
      await apiClient.deleteStaff(userId);
      toast.success('User deleted!');
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-red-700" />
          <h1 className="text-2xl font-bold">System Management - Full CRUD</h1>
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
        {activeTab !== 'users' && (
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
        )}

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
                  {loading ? 'Updating...' : 'Update Stock'}
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
            {/* Add New Entry */}
            <div className="border rounded-lg p-6 bg-green-50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Opening Stock Entry
              </h2>
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
                    value={stockData.productId}
                    onChange={(e) => setStockData({...stockData, productId: e.target.value})}
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
                    value={stockData.quantity}
                    onChange={(e) => setStockData({...stockData, quantity: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>

                <button
                  onClick={handleAddHistoryEntry}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Entry'}
                </button>
              </div>
            </div>

            {/* Edit Entry */}
            {historyEdit.id && (
              <div className="border rounded-lg p-6 bg-blue-50">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit History Entry
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <input
                      type="date"
                      value={historyEdit.date}
                      onChange={(e) => setHistoryEdit({...historyEdit, date: e.target.value})}
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Opening Stock (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={historyEdit.openingStock}
                      onChange={(e) => setHistoryEdit({...historyEdit, openingStock: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Closing Stock (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={historyEdit.closingStock}
                      onChange={(e) => setHistoryEdit({...historyEdit, closingStock: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateHistory}
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update Entry'}
                    </button>
                    <button
                      onClick={() => setHistoryEdit({ id: '', openingStock: 0, closingStock: 0, date: '' })}
                      className="px-6 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* History List */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Stock History Entries</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stockHistory.map(entry => (
                  <div key={entry.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-medium">{entry.date}</div>
                      <div className="text-sm text-gray-600">
                        Product ID: {entry.product_id} | Opening: {entry.opening_stock}kg | Closing: {entry.closing_stock || 'N/A'}kg
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHistoryEdit({
                          id: entry.id,
                          openingStock: entry.opening_stock,
                          closingStock: entry.closing_stock || 0,
                          date: entry.date
                        })}
                        className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(entry.id)}
                        className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Update User */}
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
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
