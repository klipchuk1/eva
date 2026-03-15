import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/lib/services/payment";
import type { YookassaWebhookEvent } from "@/lib/yukassa/types";

export async function POST(request: Request) {
  try {
    const event: YookassaWebhookEvent = await request.json();

    console.log("[YooKassa Webhook]", event.event, event.object.id);

    if (event.event === "payment.succeeded") {
      await handlePaymentWebhook({
        yookassaPaymentId: event.object.id,
        status: "succeeded",
        paymentMethod: event.object.metadata?.payment_method,
      });
    } else if (event.event === "payment.canceled") {
      await handlePaymentWebhook({
        yookassaPaymentId: event.object.id,
        status: "canceled",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Webhook Error]", error);
    // Always return 200 to YooKassa to prevent retries
    return NextResponse.json({ success: true });
  }
}
