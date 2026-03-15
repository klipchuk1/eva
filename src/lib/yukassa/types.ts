export interface YookassaPayment {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  amount: {
    value: string;
    currency: string;
  };
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
  description?: string;
  metadata?: Record<string, string>;
  paid: boolean;
  created_at: string;
}

export interface CreatePaymentRequest {
  amount: {
    value: string;
    currency: string;
  };
  capture: boolean;
  confirmation: {
    type: string;
    return_url: string;
  };
  description: string;
  metadata?: Record<string, string>;
}

export interface YookassaWebhookEvent {
  type: string;
  event: string;
  object: YookassaPayment;
}
