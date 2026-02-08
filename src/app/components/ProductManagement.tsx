import { useEffect, useState } from 'react';
import { Package, Plus, Edit2, Trash2, Search, Store } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import apiClient from '../api/client';

export function ProductManagement() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: 'Meat',
    pricePerKg: '',
    lowStockThreshold: '20',
    image: '🥩',
    initialStock: '0',
  });

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadProducts();
    }
  }, [selectedBranchId]);

  const loadBranches = async () => {
    try {
      const data = await apiClient.getBranches();
      const branchesArray = Array.isArray(data) ? data : [];
      setBranches(branchesArray);
      
      // Select first branch by default
      if (branchesArray.length > 0 && !selectedBranchId) {
        setSelectedBranchId(branchesArray[0].id);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
      toast.error('Failed to load branches');
    }
  };

  const loadProducts = async () => {
    if (!selectedBranchId) return;
    
    try {
      setLoading(true);
      const data = await apiClient.getBranchProducts(selectedBranchId);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!formData.name || !formData.category || !formData.pricePerKg) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedBranchId) {
      toast.error('Please select a branch');
      return;
    }

    try {
      await apiClient.addProductToBranch(
        selectedBranchId,
        formData.name,
        formData.category,
        parseFloat(formData.pricePerKg),
        parseInt(formData.lowStockThreshold) || 20,
        formData.image,
        parseFloat(formData.initialStock) || 0
      );
      
      toast.success('Product added to branch successfully');
      setShowAddDialog(false);
      resetForm();
      await loadProducts();
    } catch (error: any) {
      console.error('Failed to add product:', error);
      toast.error(error.response?.data?.error || 'Failed to add product');
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;

    try {
      await apiClient.updateProduct(selectedProduct.id, {
        name: formData.name,
        category: formData.category,
        price_per_kg: parseFloat(formData.pricePerKg),
        low_stock_threshold: parseInt(formData.lowStockThreshold) || 20,
        image: formData.image,
      });
      
      toast.success('Product updated successfully');
      setShowEditDialog(false);
      setSelectedProduct(null);
      resetForm();
      await loadProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
      toast.error('Failed to update product');
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct || !selectedBranchId) return;

    try {
      await apiClient.removeProductFromBranch(selectedBranchId, selectedProduct.id);
      
      toast.success('Product removed from branch successfully');
      setShowDeleteDialog(false);
      setSelectedProduct(null);
      await loadProducts();
    } catch (error) {
      console.error('Failed to remove product:', error);
      toast.error('Failed to remove product from branch');
    }
  };

  const openEditDialog = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      pricePerKg: product.price_per_kg.toString(),
      lowStockThreshold: product.low_stock_threshold.toString(),
      image: product.image || '🥩',
      initialStock: (product.current_stock || 0).toString(),
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (product: any) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Meat',
      pricePerKg: '',
      lowStockThreshold: '20',
      image: '🥩',
      initialStock: '0',
    });
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading products...</p>
      </div>
    );
  }

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  return (
    <div className="space-y-6 p-4 md:p-6 bg-neutral-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-1">Product Management</h1>
          <p className="text-neutral-600">Manage products by branch</p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)} 
          className="bg-red-700 hover:bg-red-800"
          disabled={!selectedBranchId}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Branch Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-red-700" />
            <Label className="text-sm font-medium">Select Branch:</Label>
          </div>
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Choose a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name} - {branch.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBranch && (
            <Badge variant="outline" className="ml-2">
              {products.length} products
            </Badge>
          )}
        </div>
      </Card>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Products Grid */}
      {selectedBranchId && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{product.image || '🥩'}</div>
                  <div>
                    <h3 className="font-bold text-neutral-900">{product.name}</h3>
                    <Badge variant="outline" className="mt-1">{product.category}</Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Price per Kg:</span>
                  <span className="font-bold text-neutral-900">KES {product.price_per_kg.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Current Stock:</span>
                  <span className="font-medium text-neutral-700">{product.current_stock?.toLocaleString() || 0} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Low Stock Alert:</span>
                  <span className="font-medium text-neutral-700">{product.low_stock_threshold}kg</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(product)}
                  className="flex-1"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDeleteDialog(product)}
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!selectedBranchId && (
        <Card className="p-12 text-center">
          <Store className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-600">Please select a branch to manage products</p>
        </Card>
      )}

      {selectedBranchId && filteredProducts.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-600">No products in this branch</p>
          <p className="text-sm text-neutral-500 mt-2">Click "Add Product" to add products to {selectedBranch?.name}</p>
        </Card>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product to {selectedBranch?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Beef - T-Bone"
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meat">Meat</SelectItem>
                  <SelectItem value="Poultry">Poultry</SelectItem>
                  <SelectItem value="Fish">Fish</SelectItem>
                  <SelectItem value="Offal">Offal</SelectItem>
                  <SelectItem value="Processed">Processed</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price">Price per Kg (KES) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.pricePerKg}
                onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                placeholder="e.g., 850"
              />
            </div>
            <div>
              <Label htmlFor="threshold">Low Stock Threshold (Kg)</Label>
              <Input
                id="threshold"
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                placeholder="e.g., 20"
              />
            </div>
            <div>
              <Label htmlFor="image">Emoji Icon</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="e.g., 🥩"
              />
            </div>
            <div>
              <Label htmlFor="initialStock">Initial Stock (Kg)</Label>
              <Input
                id="initialStock"
                type="number"
                value={formData.initialStock}
                onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                placeholder="e.g., 100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} className="bg-red-700 hover:bg-red-800">
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Product Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Category *</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meat">Meat</SelectItem>
                  <SelectItem value="Poultry">Poultry</SelectItem>
                  <SelectItem value="Fish">Fish</SelectItem>
                  <SelectItem value="Offal">Offal</SelectItem>
                  <SelectItem value="Processed">Processed</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-price">Price per Kg (KES) *</Label>
              <Input
                id="edit-price"
                type="number"
                value={formData.pricePerKg}
                onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-threshold">Low Stock Threshold (Kg)</Label>
              <Input
                id="edit-threshold"
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-image">Emoji Icon</Label>
              <Input
                id="edit-image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedProduct(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEditProduct} className="bg-red-700 hover:bg-red-800">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Product from Branch</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neutral-700">
              Are you sure you want to remove <strong>{selectedProduct?.name}</strong> from <strong>{selectedBranch?.name}</strong>?
            </p>
            <p className="text-sm text-amber-600 mt-2">
              Note: This will only remove the product from this branch. It will remain available in other branches.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setSelectedProduct(null); }}>
              Cancel
            </Button>
            <Button onClick={handleDeleteProduct} className="bg-red-700 hover:bg-red-800">
              Remove from Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
