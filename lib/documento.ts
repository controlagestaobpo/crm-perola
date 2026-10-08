// CPF/CNPJ guardado só com dígitos; vazio = não informado.
export function limparDocumento(valor: string | null | undefined) {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  return digitos || null;
}

export function documentoValido(digitos: string | null) {
  return digitos === null || digitos.length === 11 || digitos.length === 14;
}

export function formatarDocumento(digitos: string | null | undefined) {
  if (!digitos) return "";
  if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digitos.length === 14) return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return digitos;
}
