// Utilitários de interface compartilhados pelas telas.

// Todo texto vindo da API passa por aqui antes de entrar no HTML
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export const icon = (name) => `<i class="ti ti-${name}" aria-hidden="true"></i>`;

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = (value) => BRL.format(Number(value) || 0);

export const rating = (value) => (value === null || value === undefined ? "Novo" : Number(value).toFixed(1).replace(".", ","));

// Sem foto, cada categoria ganha uma cor e um ícone (mesmas cores nos dois temas, como uma foto)
const CATEGORY_STYLES = [
  [/lanche|burger|hamb/i, "#E0892B", "burger"],
  [/pizz/i, "#C9472F", "pizza"],
  [/japon|sushi|temaki|combinad/i, "#2A8C7C", "fish"],
  [/bebida|suco|refri|shake/i, "#8A5A3C", "cup"],
  [/porç|porc|entrada|salada|saud/i, "#B08A1E", "salad"],
  [/doce|sobremesa|açaí|acai/i, "#B4507A", "ice-cream"]
];

export function categoryStyle(category) {
  const match = CATEGORY_STYLES.find(([re]) => re.test(category || ""));
  return match ? { color: match[1], icon: match[2] } : { color: "#4F7A63", icon: "tools-kitchen-2" };
}

// Bloco de foto: imagem enviada pelo upload ou cor + ícone da categoria
export function cover(imageUrl, category, className = "") {
  const style = categoryStyle(category);
  const img = imageUrl ? `<img src="${esc(imageUrl)}" alt="" loading="lazy">` : "";
  return `<div class="cover ${className}" style="background:${style.color}">${icon(style.icon)}${img}</div>`;
}

export function setMessage(el, text, type = "error") {
  el.textContent = text || "";
  el.className = `message ${text ? type : ""}`;
}

let toastTimer;
export function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

export function emptyState(iconName, title, text, action = "") {
  return `<div class="empty">${icon(iconName)}<strong>${esc(title)}</strong><p>${esc(text)}</p>${action}</div>`;
}

export const skeletons = (n) => `<div aria-busy="true" aria-label="Carregando">${'<div class="skeleton"></div>'.repeat(n)}</div>`;

// Campo de formulário no padrão do mockup (rótulo, ícone e caixa)
export function field({ label, name, iconName, type = "text", placeholder = "", value = "", required = false, attrs = "", textarea = false, hint = "" }) {
  const req = required ? "required" : "";
  const control = textarea
    ? `<textarea name="${name}" placeholder="${esc(placeholder)}" ${req} ${attrs}>${esc(value)}</textarea>`
    : `<input name="${name}" type="${type}" placeholder="${esc(placeholder)}" value="${esc(value)}" ${req} ${attrs}>`;
  return `<label class="field"><span class="field-label">${esc(label)}${required ? " *" : ""}</span>
    <span class="field-box${textarea ? " area" : ""}">${icon(iconName)}${control}</span>
    ${hint ? `<span class="field-hint">${esc(hint)}</span>` : ""}</label>`;
}

// Mesmas regras do upload.middleware da API, conferidas antes de enviar
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE = 5 * 1024 * 1024;

export function checkImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) return "Use uma imagem JPG, PNG ou WebP.";
  if (file.size > MAX_IMAGE) return "A imagem deve ter até 5 MB.";
  return null;
}

export const firstName = (name) => String(name || "").trim().split(/\s+/)[0];
export const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
