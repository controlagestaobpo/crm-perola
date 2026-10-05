// Senha fácil de ditar/digitar: sem letras que se confundem (l, I, O, 0).
const LETRAS = "abcdefghjkmnpqrstuvwxyz";
const DIGITOS = "23456789";

function sortear(alfabeto: string, quantidade: number) {
  const valores = crypto.getRandomValues(new Uint32Array(quantidade));
  return Array.from(valores, (v) => alfabeto[v % alfabeto.length]).join("");
}

export function gerarSenha() {
  return `Perola-${sortear(LETRAS, 4)}${sortear(DIGITOS, 4)}`;
}
