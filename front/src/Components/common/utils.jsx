import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function decodeHtmlEntities(text) {
  if (!text) return text;

  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  const decoded = textarea.value;
  textarea.remove();
  return decoded;
}