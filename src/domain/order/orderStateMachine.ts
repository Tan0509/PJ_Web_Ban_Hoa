export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Order State Machine – single source of truth
// Do NOT bypass this logic when updating order status
export function validateTransition(from: OrderStatus, to: OrderStatus) {
  if (from === to) return true;
  const allowed = transitions[from] || [];
  return allowed.includes(to);
}

export function getAllowedNextStates(current: OrderStatus): OrderStatus[] {
  return transitions[current] || [];
}
