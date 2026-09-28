"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "rounded-lg bg-perola-lima px-4 py-2 text-sm font-semibold text-perola-texto hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? "Salvando..." : children}
    </button>
  );
}
