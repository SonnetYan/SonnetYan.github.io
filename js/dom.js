// Small DOM helpers shared by the other modules. No state, no knowledge of the content.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// True when a content field is filled in: a non-empty list, or text that is not blank.
export const filled = (value) => (Array.isArray(value) ? value.length > 0 : String(value ?? "").trim() !== "");

export function put(node, ...kids) {  // append, skipping whatever was left out
  node.append(...kids.filter((kid) => kid != null && kid !== false && kid !== ""));
  return node;
}

// el("p", { class: "sub", text: "..." }, ...children). "text" sets textContent, "html" sets innerHTML
// (only for trusted strings from content.js), anything else becomes an attribute.
export function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else node.setAttribute(key, value);
  }
  return put(node, ...kids);
}
