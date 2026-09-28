import type { ActionState } from "@/lib/form-state";

export default function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm text-perola-erro">{state.error}</p>;
  if (state.success) return <p className="text-sm text-perola-tag-pos-texto">{state.success}</p>;
  return null;
}
