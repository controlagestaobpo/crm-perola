import { Suspense } from "react";
import CadastroForm from "@/components/CadastroForm";

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroForm />
    </Suspense>
  );
}
