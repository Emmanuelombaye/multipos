// Utility function to get product unit and labels
export const getProductUnit = (productName) => {
  const name = (productName || '').toLowerCase();
  
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
    return `${Math.round(value)} ${unitLabel}`;
  }
  
  return `${value.toFixed(2)} ${unitLabel}`;
};

// Format price with appropriate unit
export const formatPrice = (price, productName) => {
  const { priceLabel } = getProductUnit(productName);
  return `KES ${parseFloat(price || 0).toLocaleString()}/${priceLabel.includes('Piece') ? 'pc' : 'kg'}`;
};
