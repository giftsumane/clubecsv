export function formatPrice(value: number) {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 2,
    }).format(value || 0);
  }