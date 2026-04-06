// Utility function to get product unit and labels
export const getProductUnit = (productName) => {
  const name = (productName || '').toLowerCase();
  
  // Check if product name contains "kuku" in any case variation
  if (name.includes('kuku')) {
    return {
      unit: 'pieces',
      unitLabel: 'pieces',
      priceLabel: 'Price per Piece',
      stockLabel: 'Stock (pieces)',
      quantityLabel: 'Quantity (pieces)'
    };
  }
  
  return {
    unit: 'kg',
    unitLabel: 'kg',
    priceLabel: 'Price per Kg',
    stockLabel: 'Stock (kg)',
    quantityLabel: 'Quantity (kg)'
  };
};

// Format quantity with appropriate unit
export const formatQuantity = (quantity, productName) => {
  const { unitLabel } = getProductUnit(productName);
  const value = parseFloat(quantity || 0);
  
  if (unitLabel === 'pieces') {
    // For pieces, show whole numbers
    return `${Math.round(value)} ${unitLabel}`;
  }
  
  // For kg, show 2 decimal places
  return `${value.toFixed(2)} ${unitLabel}`;
};

// Format price with appropriate unit
export const formatPrice = (price, productName) => {
  const { priceLabel } = getProductUnit(productName);
  const unit = priceLabel.includes('Piece') ? 'pc' : 'kg';
  return `KES ${parseFloat(price || 0).toLocaleString()}/${unit}`;
};
