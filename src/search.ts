import searchIcon from "lucide-static/icons/search.svg" with { type: "text" };
import { attachPopover, headerEndCell } from "./popover";

const ALGOLIA = "https://hn.algolia.com/";

/**
 * A search button in the header. It submits to the same place as the search box in HN's
 * footer, read from that form so a change on HN's side carries over.
 */
export function mountSearch(): void {
  const header = headerEndCell();
  if (!header) return;
  const footerForm = document.querySelector<HTMLFormElement>('form[action*="algolia"]');

  const button = document.createElement("button");
  button.type = "button";
  button.className = "phn-icon-btn";
  button.title = "Search Hacker News";
  button.setAttribute("aria-label", "Search Hacker News");
  button.innerHTML = searchIcon;

  const input = document.createElement("input");
  input.type = "search";
  input.name = "q";
  input.placeholder = "Search stories and comments";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Search Hacker News");

  const form = document.createElement("form");
  form.className = "phn-panel phn-search";
  form.hidden = true;
  form.method = "get";
  form.action = footerForm?.action ?? ALGOLIA;
  form.role = "search";
  form.append(input);

  attachPopover(button, form, () => input.select());
  header.append(button);
  document.body.append(form);
}
