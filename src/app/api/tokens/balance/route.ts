import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/services/token";

export async function GET() {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await getBalance(user.id);
    return NextResponse.json({ balance });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
