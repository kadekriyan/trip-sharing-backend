export interface MidtransNotification {
  order_id: string
  transaction_status: string
  transaction_id?: string
  signature_key?: string
  gross_amount?: string
  status_code?: string
  payment_type?: string
}
