import { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Printer, CreditCard, Smartphone, Banknote, Plus, Minus, Receipt, PackageSearch, Loader, RefreshCw, Store } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface CartItem {
  productId: string;
  productName: string;
  pricePerKg: number;
  quantity: number;
  total: number;
  image?: string;
}

interface POSScreenProps {
  branchId: string;
  cashierName: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price_per_kg: number;
  stock: number;
  image?: string;
}

export function POSScreen({ branchId, cashierName }: POSScreenProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [customWeight, setCustomWeight] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  });

  // Expense states
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<string>('petty-cash');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  // Stock count states
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [closingStocks, setClosingStocks] = useState<{ [id: string]: string }>({});

  // Mobile View Toggle ('menu' or 'cart')
  const [mobileView, setMobileView] = useState<'menu' | 'cart'>('menu');

  // Fetch products with stock
  useEffect(() => {
    fetchProducts();

    // Poll for product updates every 10 seconds
    const intervalId = setInterval(() => {
      fetchProducts(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [branchId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchProducts = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoadingProducts(true);
      }
      const data = await apiClient.getBranchProducts(branchId);
      setProducts(data);
      if (!silent && !isOnline && data.length === 0) {
        toast.error('Offline and no cached products available');
      }
    } catch (error) {
      if (!silent) {
        toast.error('Failed to load products');
      }
    } finally {
      if (!silent) {
        setIsLoadingProducts(false);
      }
    }
  };

  const quickWeights = [0.25, 0.5, 1, 1.5, 2, 2.5];

  const addToCart = (productId: string, weight: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (weight > product.stock) {
      toast.error('Insufficient stock available');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? {
              ...item,
              quantity: item.quantity + weight,
              total: (item.quantity + weight) * item.pricePerKg,
            }
            : item
        );
      }
      return [
        ...prev,
        {
          productId,
          productName: product.name,
          pricePerKg: product.price_per_kg,
          quantity: weight,
          total: weight * product.price_per_kg,
          image: product.image || '📦',
        },
      ];
    });

    setSelectedProduct(null);
    setCustomWeight('');
    toast.success(`Added ${weight}kg of ${product.name}`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    toast.success('Item removed from cart');
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQuantity = Math.max(0, item.quantity + change);
            return {
              ...item,
              quantity: newQuantity,
              total: newQuantity * item.pricePerKg,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setSelectedProduct(null);
    toast.success('Cart cleared');
  };

  const handlePayment = async (method: 'cash' | 'mpesa' | 'card') => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessing(true);
    try {
      const items = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        pricePerKg: item.pricePerKg,
        subtotal: item.total,
      }));

      const response = await apiClient.createTransaction(branchId, items, method);

      const total = cart.reduce((sum, item) => sum + item.total, 0);
      if (response?.offline) {
        toast.success('Sale saved offline and will sync when online');
        setProducts((prev) =>
          prev.map((product) => {
            const item = cart.find((cartItem) => cartItem.productId === product.id);
            if (!item) {
              return product;
            }
            return {
              ...product,
              stock: Math.max(0, product.stock - item.quantity),
            };
          })
        );
      } else {
        toast.success(
          `Payment of KES ${total.toLocaleString()} processed via ${method.toUpperCase()}. Receipt printed!`
        );
      }

      setCart([]);
      setSelectedProduct(null);

      // Refresh products to update stock immediately
      if (!response?.offline) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure backend processes
        await fetchProducts();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogExpense = async () => {
    if (!expenseAmount || !expenseDesc) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiClient.createExpense(branchId, expenseCategory, parseFloat(expenseAmount), expenseDesc);
      if (response?.offline) {
        toast.success('Expense saved offline and will sync when online');
      } else {
        toast.success('Expense logged successfully');
      }
      setExpenseAmount('');
      setExpenseDesc('');
      setShowExpenseDialog(false);
    } catch (error) {
      toast.error('Failed to log expense');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveStockCount = async () => {
    const productsWithStock = Object.entries(closingStocks).filter(([_, stock]) => stock && parseFloat(stock) >= 0);

    if (productsWithStock.length === 0) {
      toast.error('Please enter closing stock for at least one product');
      return;
    }

    setIsProcessing(true);
    try {
      const getLocalDateString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const today = getLocalDateString();

      // Save closing stock for all products with entered values
      const responses = await Promise.all(
        productsWithStock.map(([productId, stock]) =>
          apiClient.recordClosingStock(productId, branchId, parseFloat(stock), today)
        )
      );

      const hasOffline = responses.some((response) => response?.offline);
      if (hasOffline) {
        toast.success('Closing stock saved offline and will sync when online');
      } else {
        toast.success(`Closing stock saved for ${productsWithStock.length} product(s)`);
      }
      setClosingStocks({});
      setShowStockDialog(false);

      // Refresh products to show updated stock
      if (!hasOffline) {
        await fetchProducts();
      }
    } catch (error) {
      console.error('Failed to save closing stock:', error);
      toast.error('Failed to save closing stock');
    } finally {
      setIsProcessing(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const cartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] gap-0 lg:gap-4 p-0 lg:p-4 bg-neutral-50 overflow-hidden pb-16 lg:pb-0">

      {/* MOBILE ONLY: High Visibility Header & Tab Switcher */}
      <div className="flex lg:hidden flex-col bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="bg-blue-600 text-white text-[10px] py-0.5 text-center font-bold tracking-widest uppercase">
          New Layout Active (v3.0) - Use Tabs Below
        </div>
        <div className="flex p-1.5 gap-1.5">
          <button
            onClick={() => setMobileView('menu')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-bold transition-all ${mobileView === 'menu' ? 'bg-red-700 text-white shadow-md scale-[1.02]' : 'bg-neutral-100 text-neutral-500'
              }`}
          >
            <Store className="w-4 h-4" />
            1. PRODUCTS
          </button>
          <button
            onClick={() => setMobileView('cart')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-bold transition-all ${mobileView === 'cart' ? 'bg-red-700 text-white shadow-md scale-[1.02]' : 'bg-neutral-100 text-neutral-500'
              }`}
          >
            <ShoppingCart className="w-4 h-4" />
            2. CART ({cart.length})
          </button>
        </div>
      </div>

      {/* Product Selection Area */}
      <div className={`flex-1 overflow-y-auto p-2 lg:p-0 pr-0 lg:pr-2 ${mobileView === 'menu' ? 'block' : 'hidden lg:block'}`}>
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200 shadow-sm lg:bg-transparent lg:border-none lg:shadow-none lg:p-0">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-neutral-900">Point of Sale</h2>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[10px] h-4 px-1 lg:hidden">v2.0 Mobile</Badge>
              </div>
              <p className="text-xs text-neutral-600">Cashier: {cashierName}</p>
            </div>
            {!isOnline && (
              <div className="px-2 py-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 md:hidden">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                OFFLINE
              </div>
            )}
          </div>
          {!isOnline && (
            <div className="hidden md:flex px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200 items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Offline mode - sales will sync when online
            </div>
          )}
          <div className="grid grid-cols-3 md:flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchProducts()}
              disabled={isLoadingProducts}
              className="text-neutral-700 border-neutral-200 h-10 px-2 sm:px-4"
            >
              <RefreshCw className={`w-4 h-4 mr-1 sm:mr-2 ${isLoadingProducts ? 'animate-spin' : ''}`} />
              <span className="text-xs sm:text-sm">Refresh</span>
            </Button>
            <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-red-700 border-red-200 h-10 px-2 sm:px-4">
                  <Receipt className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Expense</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-xl">
                <DialogHeader>
                  <DialogTitle>Log Operational Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplies">Supplies</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="petty-cash">Petty Cash</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (KES)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g. Cleaning detergent"
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
                  <Button className="bg-red-700 hover:bg-red-800" onClick={handleLogExpense}>Submit Expense</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-neutral-700 border-neutral-200 h-10 px-2 sm:px-4">
                  <PackageSearch className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Stock</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle>Daily Stock Count - Closing Stock</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-neutral-600 mb-4">Enter current physical stock levels (kg) for today's closing.</p>
                  <div className="space-y-3">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{product.image || '📦'}</span>
                          <div>
                            <p className="font-semibold text-sm">{product.name}</p>
                            <p className="text-xs text-neutral-500">System: {product.stock}kg</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="w-24 h-9"
                            placeholder="0.00"
                            value={closingStocks[product.id] || ''}
                            onChange={(e) => setClosingStocks({ ...closingStocks, [product.id]: e.target.value })}
                          />
                          <span className="text-sm font-medium">kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowStockDialog(false)} disabled={isProcessing}>Cancel</Button>
                  <Button
                    className="bg-red-700 hover:bg-red-800"
                    onClick={handleSaveStockCount}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Saving...' : 'Save Closing Stock'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Product Grid */}
        {isLoadingProducts ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-red-700" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 mb-24 md:mb-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${selectedProduct === product.id
                  ? 'ring-2 ring-red-700 bg-red-50'
                  : 'hover:border-red-200'
                  } ${product.stock < 5 ? 'opacity-60' : ''}`}
                onClick={() => setSelectedProduct(product.id)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{product.image || '📦'}</div>
                  <h3 className="font-semibold text-neutral-900 mb-1 text-sm">{product.name}</h3>
                  <p className="text-lg font-bold text-red-700 mb-1">
                    KES {product.price_per_kg}/kg
                  </p>
                  <Badge
                    variant={product.stock < 10 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {product.stock}kg left
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Weight Selector - Mobile Fixed Bottom / Desktop Below Grid */}
        {selectedProduct && (
          <Card className="fixed lg:relative bottom-0 left-0 right-0 lg:bottom-auto p-4 bg-white border-t-4 border-red-700 z-10 shadow-xl lg:mb-4">
            <h3 className="font-semibold text-neutral-900 mb-3">
              Select Weight for{' '}
              {products.find((p) => p.id === selectedProduct)?.name}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
              {quickWeights.map((weight) => (
                <Button
                  key={weight}
                  onClick={() => addToCart(selectedProduct, weight)}
                  className="h-14 bg-red-700 hover:bg-red-800 text-white"
                >
                  {weight}kg
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="Custom weight (kg)"
                value={customWeight}
                onChange={(e) => setCustomWeight(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  const weight = parseFloat(customWeight);
                  if (weight > 0) {
                    addToCart(selectedProduct, weight);
                  }
                }}
                className="bg-red-700 hover:bg-red-800"
                disabled={!customWeight || parseFloat(customWeight) <= 0}
              >
                Add
              </Button>
              <Button
                onClick={() => {
                  setSelectedProduct(null);
                  setCustomWeight('');
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Cart & Checkout Panel */}
      <Card className={`w-full lg:w-96 p-3 lg:p-4 flex flex-col h-full overflow-hidden bg-white shadow-lg border-t-4 border-red-700 lg:border-t-0 ${mobileView === 'cart' ? 'block' : 'hidden lg:flex'}`}>
        <div className="flex items-center justify-between mb-2 lg:mb-4 pb-2 lg:pb-3 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 lg:w-6 lg:h-6 text-red-700" />
            <h3 className="text-lg font-bold text-neutral-900">Cart</h3>
            {cart.length > 0 && (
              <Badge className="bg-red-700 text-white">{cart.length} items</Badge>
            )}
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-700 hover:text-red-800 h-8">
              Clear All
            </Button>
          )}
        </div>

        {/* Cart Items - Better Spacing */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-1">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 flex flex-col items-center justify-center h-full">
              <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">Cart is empty</p>
              <p className="text-xs text-neutral-500 mt-1">Select products to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="p-3 bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-lg border border-neutral-200 hover:border-red-300 transition-colors">
                {/* Product Name & Price */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.image}</span>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-neutral-900 text-xs sm:text-sm truncate">
                          {item.productName}
                        </h4>
                        <p className="text-[10px] text-neutral-600">
                          KES {item.pricePerKg}/kg
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="font-bold text-red-700 text-xs sm:text-sm whitespace-nowrap ml-2">
                    KES {item.total.toLocaleString()}
                  </p>
                </div>

                {/* Quantity Control Section */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 bg-white rounded border border-neutral-200">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateQuantity(item.productId, -0.5)}
                      className="h-8 w-8 p-0 hover:bg-red-50 text-red-700"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-semibold text-neutral-900 w-12 text-center">
                      {item.quantity.toFixed(2)}kg
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateQuantity(item.productId, 0.5)}
                      className="h-8 w-8 p-0 hover:bg-green-50 text-green-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromCart(item.productId)}
                    className="h-8 w-8 p-0 text-red-700 hover:bg-red-50 hover:text-red-800"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals - More Prominent */}
        {cart.length > 0 && (
          <div className="border-t-2 border-red-200 pt-3 mb-4 bg-gradient-to-b from-red-50 to-transparent p-3 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-600 font-medium">Total Items:</span>
              <span className="font-bold text-neutral-900">{cartItems.toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xl lg:text-2xl font-bold text-neutral-900">Total:</span>
              <span className="text-2xl lg:text-3xl font-bold text-red-700">KES {cartTotal.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Payment Buttons - Touch-friendly */}
        <div className="space-y-2">
          <Button
            onClick={() => handlePayment('cash')}
            disabled={cart.length === 0 || isProcessing}
            className="w-full h-12 lg:h-14 bg-green-700 hover:bg-green-800 text-white disabled:opacity-50 font-semibold text-base"
          >
            {isProcessing ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Banknote className="w-5 h-5 mr-2" />}
            Cash Payment
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handlePayment('mpesa')}
              disabled={cart.length === 0 || isProcessing}
              className="w-full h-12 lg:h-13 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 font-semibold"
            >
              <Smartphone className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">M-Pesa</span>
              <span className="sm:hidden">M-Pesa</span>
            </Button>
            <Button
              onClick={() => handlePayment('card')}
              disabled={cart.length === 0 || isProcessing}
              className="w-full h-12 lg:h-13 bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50 font-semibold"
            >
              <CreditCard className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">Card</span>
              <span className="sm:hidden">Card</span>
            </Button>
          </div>
          <Button
            onClick={() => {
              if (cart.length > 0) {
                toast.success('Receipt printed!');
              }
            }}
            disabled={cart.length === 0}
            variant="outline"
            className="w-full h-10 font-semibold"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </Card>

      {/* Hidden Debug Info (Pressing 'D' to see is too complex, just show small at bottom for now) */}
      <div className="fixed bottom-1 left-1 text-[8px] text-neutral-300 pointer-events-none opacity-50 z-50">
        API: {(import.meta as any).env.VITE_API_URL || 'Localhost'} | Branch: {branchId} | ID: {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id.slice(0, 5) : 'Anon'}
      </div>
    </div>
  );
}
