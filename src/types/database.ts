export type GenerationType = "image" | "video" | "audio";
export type GenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "canceled";
export type ModelStatus = "uploading" | "training" | "ready" | "failed";
export type PaymentStatus = "pending" | "succeeded" | "canceled" | "refunded";
export type TokenTransactionType =
  | "purchase"
  | "generation"
  | "refund"
  | "bonus"
  | "referral";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  token_balance: number;
  total_spent_rub: number;
  total_generations: number;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  type: GenerationType;
  status: GenerationStatus;
  prompt: string;
  negative_prompt: string | null;
  model_id: string;
  provider: string;
  settings: Record<string, unknown>;
  personal_model_id: string | null;
  token_cost: number;
  result_url: string | null;
  result_metadata: Record<string, unknown>;
  thumbnail_url: string | null;
  external_id: string | null;
  external_status: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price_rub: number;
  bonus_tokens: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  yookassa_payment_id: string | null;
  package_id: string | null;
  amount_rub: number;
  tokens_amount: number;
  status: PaymentStatus;
  payment_method: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  confirmed_at: string | null;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: TokenTransactionType;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface PersonalModel {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ModelStatus;
  training_provider: string | null;
  training_external_id: string | null;
  training_model_version: string | null;
  trigger_word: string | null;
  training_images: string[];
  training_images_count: number;
  training_token_cost: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Reference-based fields (for Nano Banana Pro approach)
  reference_urls?: string[];
  avatar_url?: string | null;
}

export interface LibraryElement {
  id: string;
  user_id: string;
  name: string;
  type: "style" | "character" | "object" | "scene" | "custom";
  prompt_text: string;
  preview_url: string | null;
  is_global: boolean;
  usage_count: number;
  created_at: string;
}

export interface PromptTemplate {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  prompt_text: string;
  type: GenerationType;
  category: string | null;
  preview_url: string | null;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}
