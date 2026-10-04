// The Copy button next to the email address. Falls back to selecting the address when the
// clipboard is not available (older browsers, insecure context).

import { $ } from "./dom.js";

export function wireCopyEmail(email) {
  $("#copy-email").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(email);
      button.textContent = "Copied";
    } catch {
      const range = document.createRange();
      range.selectNodeContents($("[data-email]"));
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "Selected";
    }
    setTimeout(() => { button.textContent = "Copy"; }, 1600);
  });
}
