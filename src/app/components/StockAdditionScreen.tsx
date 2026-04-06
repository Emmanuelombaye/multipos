import { useEffect, useState } from 'react';
import { Plus, Package, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface StockAdditionScreenProps {
  branchId: string;
  branchName: string;
  cashierName: string;
}

export function StockAdditionScreen({ branchId, branchName, cashierName }: StockAdditionScreenProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [additions, setAdditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [branchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, additionsData] = await Promise.all([
        apiClient.getBranchProducts(branchId),
        apiClient.getStockAdditions(branchId, 50, 0)
      ]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setAdditions(Array.isArray(additionsData?.data) ? additionsData.data : []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.currentTarget;
    const data = new FormData(form);
    const productId = data.get('product') as string;
    const quantity = parseFloat(data.get('quantity') as string);
    const reason = data.get('reason') as string;

    if (!productId || !quantity || quantity <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.addStockMidShift(branchId, productId, quantity, reason);
      toast.success(`Added ${quantity}kg successfully`);
      setShowAddForm(false);
      form.reset();
      setSelectedProduct(null);
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to add stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 md:p-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Add Stock Mid-Shift</h1>
          <p className="text-sm text-neutral-500">{branchName}</p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:scale-95"
        >
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">When to use this:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Supplier delivers stock during your shift</li>
              <li>Stock correction needed</li>
              <li>Emergency restocking</li>
            </ul>
            <p className="mt-2 font-medium">✅ This will update opening stock for today's records</p>
          </div>
        </div>
      </Card>

      {/* Add Stock Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-lg font-medium active:scale-95 shadow-lg"
      >
        <Plus className="w-5 h-5" />
        Add Stock Received
      </button>

      {/* Recent Additions */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Recent Stock Additions</h2>
        {additions.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p className="text-neutral-500">No stock additions yet today</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {additions.map((addition) => {
              const product = products.find(p => p.id === addition.product_id);
              return (
                <Card key={addition.id} className="p-4 border-l-4 border-l-green-500">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{product?.image || '🥩'}</span>
                      <div>
                        <p className="font-semibold text-neutral-900">{product?.name || 'Product'}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(addition.created_at).toLocaleString('en-KE', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-0">
                      +{addition.quantity}kg
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-neutral-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-neutral-500">Before</p>
                      <p className="text-sm font-bold text-neutral-700">{addition.stock_before}kg</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-neutral-500">Added</p>
                      <p className="text-sm font-bold text-green-700">+{addition.quantity}kg</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-neutral-500">After</p>
                      <p className="text-sm font-bold text-green-700">{addition.stock_after}kg</p>
                    </div>
                  </div>

                  {addition.reason && (
                    <p className="text-xs text-neutral-600 italic">"{addition.reason}"</p>
                  )}
                  <p className="text-xs text-neutral-400 mt-1">Added by: {addition.added_by}</p>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Stock Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-lg">Add Stock Received</h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedProduct(null);
                }}
                className="p-2 hover:bg-neutral-100 rounded-lg"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleAddStock} className="p-4 space-y-4 pb-32">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Product <span className="text-red-600">*</span>
                </label>
                <select
                  name="product"
                  required
                  className="w-full border rounded-lg p-3 text-base"
                  onChange={(e) => {
                    const prod = products.find(p => p.id === e.target.value);
                    setSelectedProduct(prod);
                  }}
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.image} {p.name} (Current: {p.current_stock}kg)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <Card className="p-3 bg-neutral-50">
                  <p className="text-xs text-neutral-500 mb-1">Current Stock Level</p>
                  <p className="text-2xl font-bold text-neutral-900">{selectedProduct.current_stock}kg</p>
                </Card>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Quantity Received (kg) <span className="text-red-600">*</span>
                </label>
                <input
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 25"
                  className="w-full border rounded-lg p-3 text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason <span className="text-red-600">*</span>
                </label>
                <select
                  name="reason"
                  required
                  className="w-full border rounded-lg p-3 text-base mb-2"
                >
                  <option value="">Select reason</option>
                  <option value="Supplier delivery">Supplier delivery</option>
                  <option value="Emergency restock">Emergency restock</option>
                  <option value="Stock correction">Stock correction</option>
                  <option value="Transfer from another branch">Transfer from another branch</option>
                  <option value="Other">Other</option>
                </select>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Additional notes (optional)"
                  className="w-full border rounded-lg p-3 text-base"
                />
              </div>

              <Card className="p-3 bg-amber-50 border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-900">
                    This will increase the stock immediately and update today's opening stock records for accurate accounting.
                  </p>
                </div>
              </Card>

              <div className="sticky bottom-0 bg-white pt-4 pb-safe border-t">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 text-white py-4 rounded-lg font-medium active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Adding Stock...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirm & Add Stock
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
