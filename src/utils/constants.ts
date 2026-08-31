export const USER_ROLES = {
  ADMIN: 'admin',
  DRIVER: 'driver',
  PARTICIPANT: 'participant',
} as const

export const BOOKING_GROUP_STATUS = {
  OPEN: 'open',
  WAITING: 'waiting',
  FULL: 'full',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const
