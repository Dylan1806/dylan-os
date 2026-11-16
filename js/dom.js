export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  apply(el, props);
  append(el, children);
  return el;
}

export function svgEl(tag, props, ...children) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value != null && value !== false) el.setAttribute(key, String(value));
  }
  for (const child of children.flat()) if (child) el.append(child);
  return el;
}

function apply(el, props) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "style" && typeof value === "object") {
      for (const [prop, val] of Object.entries(value)) {
        if (prop.startsWith("--")) el.style.setProperty(prop, String(val));
        else el.style[prop] = val;
      }
    }
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key.startsWith("aria-") || key === "role") el.setAttribute(key, value === true ? "" : String(value));
    else if (key in el) el[key] = value;
    else el.setAttribute(key, value === true ? "" : String(value));
  }
}

function append(el, children) {
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}
