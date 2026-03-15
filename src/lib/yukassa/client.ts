import { v4 as uuidv4 } from "uuid";
import type { CreatePaymentRequest, YookassaPayment } from "./types";

const YOOKASSA_API_URL = "https://api.yookassa.ru/v3";

function getCredentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    throw new Error("YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY must be set");
  }
  return { shopId, secretKey };
}

function getAuthHeader() {
  const { shopId, secretKey } = getCredentials();
  return "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64");
}

export async function createPayment(params: {
  amountRub: number;
  description: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}): Promise<YookassaPayment> {
  const idempotenceKey = uuidv4();

  const body: CreatePaymentRequest = {
    amount: {
      value: params.amountRub.toFixed(2),
      currency: "RUB",
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: params.returnUrl,
    },
    description: params.description,
    metadata: params.metadata,
  };

  const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YooKassa API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function getPayment(paymentId: string): Promise<YookassaPayment> {
  const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YooKassa API error ${response.status}: ${errorText}`);
  }

  return response.json();
}
