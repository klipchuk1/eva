import { createServiceClient } from "@/lib/supabase/server";

export async function getBalance(userId: string): Promise<number> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("token_balance")
    .eq("id", userId)
    .single();

  if (error) throw new Error(`Failed to get balance: ${error.message}`);
  return data.token_balance;
}

export async function deductTokens(params: {
  userId: string;
  amount: number;
  type: string;
  referenceId: string;
  description: string;
}): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("deduct_tokens", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_type: params.type,
    p_reference_id: params.referenceId,
    p_description: params.description,
  });

  if (error) throw new Error(`Failed to deduct tokens: ${error.message}`);
  return data as boolean;
}

export async function addTokens(params: {
  userId: string;
  amount: number;
  type: string;
  referenceId: string;
  description: string;
}): Promise<number> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("add_tokens", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_type: params.type,
    p_reference_id: params.referenceId,
    p_description: params.description,
  });

  if (error) throw new Error(`Failed to add tokens: ${error.message}`);
  return data as number;
}

export async function refundTokens(
  userId: string,
  amount: number,
  generationId: string
): Promise<void> {
  await addTokens({
    userId,
    amount,
    type: "refund",
    referenceId: generationId,
    description: `Возврат за неудачную генерацию`,
  });
}
