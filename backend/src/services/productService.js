import { supabase } from '../db/supabase.js';

export const getAllProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const getProductById = async (id) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createProduct = async (name, category, pricePerKg, lowStockThreshold = 20, image) => {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      category,
      price_per_kg: pricePerKg,
      low_stock_threshold: lowStockThreshold,
      image,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProduct = async (id, updates) => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProduct = async (id) => {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getProductsWithStock = async (branchId) => {
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (productsError) throw productsError;

  // Get stock for each product in the branch
  const { data: stocks, error: stocksError } = await supabase
    .from('branch_stock')
    .select('*')
    .eq('branch_id', branchId);

  if (stocksError) throw stocksError;

  const stockMap = {};
  stocks?.forEach(s => {
    stockMap[s.product_id] = s.current_stock;
  });

  return products.map(p => ({
    ...p,
    stock: stockMap[p.id] || 0,
  }));
};

// Get only products available in a specific branch (have branch_stock entry)
export const getBranchProducts = async (branchId) => {
  const { data, error } = await supabase
    .from('branch_stock')
    .select(`
      product_id,
      current_stock,
      price_per_kg,
      low_stock_threshold,
      products (
        id,
        name,
        category,
        price_per_kg,
        low_stock_threshold,
        image
      )
    `)
    .eq('branch_id', branchId);

  if (error) throw error;

  // Flatten the structure and prioritize branch-specific overrides
  return data.map(item => ({
    ...item.products,
    price_per_kg: item.price_per_kg ?? item.products.price_per_kg,
    low_stock_threshold: item.low_stock_threshold ?? item.products.low_stock_threshold,
    stock: item.current_stock,
    current_stock: item.current_stock,
  }));
};

// Add product to a specific branch
export const addProductToBranch = async (branchId, productData) => {
  const { name, category, pricePerKg, lowStockThreshold = 20, image, initialStock = 0 } = productData;

  // First, check if product with this name already exists
  const { data: existingProduct } = await supabase
    .from('products')
    .select('*')
    .eq('name', name)
    .single();

  let productId;

  if (existingProduct) {
    // Product exists, use its ID
    productId = existingProduct.id;
  } else {
    // Create new product
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({
        name,
        category,
        price_per_kg: pricePerKg,
        low_stock_threshold: lowStockThreshold,
        image,
      })
      .select()
      .single();

    if (productError) throw productError;
    productId = newProduct.id;
  }

  // Check if branch_stock entry already exists
  const { data: existingStock } = await supabase
    .from('branch_stock')
    .select('*')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .single();

  if (existingStock) {
    throw new Error('Product already exists in this branch');
  }

  // Add branch_stock entry
  const { data: stockEntry, error: stockError } = await supabase
    .from('branch_stock')
    .insert({
      branch_id: branchId,
      product_id: productId,
      current_stock: initialStock,
    })
    .select()
    .single();

  if (stockError) throw stockError;

  // Return the product with stock
  const { data: product, error: productFetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productFetchError) throw productFetchError;

  return {
    ...product,
    current_stock: initialStock,
  };
};

// Remove product from a specific branch (delete branch_stock entry only)
export const removeProductFromBranch = async (branchId, productId) => {
  const { data, error } = await supabase
    .from('branch_stock')
    .delete()
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .select();

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error('Product not found in this branch');
  }

  return data[0];
};

export const updateBranchProduct = async (branchId, productId, updates) => {
  // Map frontend field names to DB names if necessary
  const dbUpdates = {};
  if (updates.pricePerKg !== undefined) dbUpdates.price_per_kg = updates.pricePerKg;
  if (updates.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = updates.lowStockThreshold;

  const { data, error } = await supabase
    .from('branch_stock')
    .update(dbUpdates)
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
