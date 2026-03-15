-- =============================================
-- EVA: AI Content Generation Platform Schema
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- 1. PROFILES
-- =====================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  token_balance INTEGER NOT NULL DEFAULT 0,
  total_spent_rub INTEGER NOT NULL DEFAULT 0,
  total_generations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================
-- 2. TOKEN PACKAGES
-- =====================
CREATE TABLE token_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  price_rub INTEGER NOT NULL,
  bonus_tokens INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 3. PAYMENTS
-- =====================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  yookassa_payment_id TEXT UNIQUE,
  package_id UUID REFERENCES token_packages(id),
  amount_rub NUMERIC(10,2) NOT NULL,
  tokens_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'canceled', 'refunded')),
  payment_method TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_yookassa ON payments(yookassa_payment_id);

-- =====================
-- 4. TOKEN TRANSACTIONS
-- =====================
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('purchase', 'generation', 'refund', 'bonus', 'referral')),
  balance_after INTEGER NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_token_tx_user ON token_transactions(user_id, created_at DESC);

-- =====================
-- 5. GENERATIONS
-- =====================
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'canceled')),
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  personal_model_id UUID,
  token_cost INTEGER NOT NULL,
  result_url TEXT,
  result_metadata JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  external_id TEXT,
  external_status TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gen_user_type ON generations(user_id, type, created_at DESC);
CREATE INDEX idx_gen_status ON generations(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_gen_external ON generations(external_id) WHERE external_id IS NOT NULL;

-- =====================
-- 6. PERSONAL MODELS
-- =====================
CREATE TABLE personal_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'training', 'ready', 'failed')),
  training_provider TEXT,
  training_external_id TEXT,
  training_model_version TEXT,
  trigger_word TEXT,
  training_images TEXT[] DEFAULT '{}',
  training_images_count INTEGER DEFAULT 0,
  training_token_cost INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_models_user ON personal_models(user_id);

-- =====================
-- 7. LIBRARY ELEMENTS
-- =====================
CREATE TABLE library_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('style', 'character', 'object', 'scene', 'custom')),
  prompt_text TEXT NOT NULL,
  preview_url TEXT,
  is_global BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_library_user ON library_elements(user_id);

-- =====================
-- 8. PROMPT TEMPLATES
-- =====================
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio')),
  category TEXT,
  preview_url TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_templates_type ON prompt_templates(type);

-- =====================
-- 9. ATOMIC TOKEN FUNCTIONS
-- =====================
CREATE OR REPLACE FUNCTION deduct_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reference_id UUID,
  p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT token_balance INTO v_balance
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  UPDATE profiles SET token_balance = token_balance - p_amount WHERE id = p_user_id;

  INSERT INTO token_transactions (user_id, amount, type, balance_after, reference_id, description)
  VALUES (p_user_id, -p_amount, p_type, v_balance - p_amount, p_reference_id, p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reference_id UUID,
  p_description TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE profiles SET token_balance = token_balance + p_amount WHERE id = p_user_id
  RETURNING token_balance INTO v_new_balance;

  INSERT INTO token_transactions (user_id, amount, type, balance_after, reference_id, description)
  VALUES (p_user_id, p_amount, p_type, v_new_balance, p_reference_id, p_description);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_generations(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET total_generations = total_generations + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_spent(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET total_spent_rub = total_spent_rub + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- 10. AUTO-UPDATE TRIGGERS
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER generations_updated BEFORE UPDATE ON generations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER personal_models_updated BEFORE UPDATE ON personal_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- 11. RLS POLICIES
-- =====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gen_own_all" ON generations FOR ALL USING (auth.uid() = user_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_own_select" ON payments FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_own_select" ON token_transactions FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE personal_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "models_own_all" ON personal_models FOR ALL USING (auth.uid() = user_id);

ALTER TABLE library_elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lib_select" ON library_elements
  FOR SELECT USING (auth.uid() = user_id OR is_global = true);
CREATE POLICY "lib_modify" ON library_elements
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpl_select" ON prompt_templates
  FOR SELECT USING (auth.uid() = user_id OR is_public = true OR user_id IS NULL);
CREATE POLICY "tpl_modify" ON prompt_templates
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_read" ON token_packages FOR SELECT USING (true);

-- =====================
-- 12. SEED DATA
-- =====================
INSERT INTO token_packages (name, tokens, price_rub, bonus_tokens, sort_order) VALUES
  ('Стартовый', 500, 500, 0, 1),
  ('Базовый', 2000, 1800, 200, 2),
  ('Про', 5000, 4000, 1000, 3),
  ('Ультра', 15000, 10000, 5000, 4);
