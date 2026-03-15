import { createServiceClient } from "@/lib/supabase/server";
import { createPayment as yookassaCreatePayment } from "@/lib/yukassa/client";
import { addTokens } from "./token";

export async function createTokenPurchase(params: {
  userId: string;
  packageId: string;
  returnUrl: string;
}) {
  const supabase = createServiceClient();

  // Get package
  const { data: pkg, error: pkgError } = await supabase
    .from("token_packages")
    .select("*")
    .eq("id", params.packageId)
    .single();

  if (pkgError || !pkg) throw new Error("Package not found");

  // Create payment record
  const totalTokens = pkg.tokens + pkg.bonus_tokens;

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      user_id: params.userId,
      package_id: params.packageId,
      amount_rub: pkg.price_rub,
      tokens_amount: totalTokens,
      status: "pending",
    })
    .select()
    .single();

  if (paymentError || !payment) {
    throw new Error("Failed to create payment record");
  }

  // Create YooKassa payment
  const yookassaPayment = await yookassaCreatePayment({
    amountRub: pkg.price_rub,
    description: `Пополнение баланса Эва: ${totalTokens} токенов`,
    returnUrl: params.returnUrl,
    metadata: {
      payment_id: payment.id,
      user_id: params.userId,
      package_id: params.packageId,
    },
  });

  // Update payment with YooKassa ID
  await supabase
    .from("payments")
    .update({ yookassa_payment_id: yookassaPayment.id })
    .eq("id", payment.id);

  return {
    paymentId: payment.id,
    confirmationUrl: yookassaPayment.confirmation?.confirmation_url,
  };
}

export async function handlePaymentWebhook(params: {
  yookassaPaymentId: string;
  status: "succeeded" | "canceled";
  paymentMethod?: string;
}) {
  const supabase = createServiceClient();

  // Find payment
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("yookassa_payment_id", params.yookassaPaymentId)
    .single();

  if (error || !payment) {
    console.error("Payment not found for YooKassa ID:", params.yookassaPaymentId);
    return;
  }

  if (payment.status !== "pending") {
    console.log("Payment already processed:", payment.id);
    return;
  }

  if (params.status === "succeeded") {
    // Update payment status
    await supabase
      .from("payments")
      .update({
        status: "succeeded",
        payment_method: params.paymentMethod || null,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    // Add tokens
    await addTokens({
      userId: payment.user_id,
      amount: payment.tokens_amount,
      type: "purchase",
      referenceId: payment.id,
      description: `Пополнение: ${payment.tokens_amount} токенов`,
    });

    // Update total spent
    await supabase.rpc("increment_spent", {
      p_user_id: payment.user_id,
      p_amount: payment.amount_rub,
    });
  } else {
    await supabase
      .from("payments")
      .update({ status: "canceled" })
      .eq("id", payment.id);
  }
}
