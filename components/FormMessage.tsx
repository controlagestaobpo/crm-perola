import type { ActionState } from "@/lib/form-state";

export default function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state.success) return <p className="text-sm text-emerald-600">{state.success}</p>;
  return null;
}
