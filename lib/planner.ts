import { supabase } from "@/lib/supabase";

export async function getOrCreatePlanner(
  email: string,
  name?: string | null
): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from("planners")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing.id as string;

  const { data: created, error: insertError } = await supabase
    .from("planners")
    .insert({ email, name })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id as string;
}
