export function shouldRevealHeader(startY, endY, pointerType) {
  if (pointerType === "touch") return endY <= 32 && startY - endY >= 40;
  return endY <= 8 && endY < startY;
}

export function installChatHeader(doc, win) {
  const header = doc.querySelector(".chat-header");
  const edge = doc.querySelector(".chat-header-edge");
  if (!header || !edge) return;
  let previousY = null;
  let touchStartY = null;
  const show = () => { header.hidden = false; edge.setAttribute("aria-expanded", "true"); };
  const hide = () => {
    header.hidden = true;
    edge.setAttribute("aria-expanded", "false");
    previousY = null;
  };
  doc.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    if (header.hidden && previousY !== null && shouldRevealHeader(previousY, event.clientY, "mouse")) show();
    else if (!header.hidden && event.clientY > header.getBoundingClientRect().bottom + 24 && !header.contains(doc.activeElement)) hide();
    previousY = event.clientY;
  }, { passive: true });
  doc.addEventListener("touchstart", event => { touchStartY = event.touches[0]?.clientY ?? null; }, { passive: true });
  doc.addEventListener("touchmove", event => {
    const endY = event.touches[0]?.clientY;
    if (touchStartY !== null && endY !== undefined && shouldRevealHeader(touchStartY, endY, "touch")) show();
  }, { passive: true });
  doc.addEventListener("touchend", () => { touchStartY = null; }, { passive: true });
  doc.addEventListener("pointerdown", event => {
    if (!header.hidden && !header.contains(event.target) && event.target !== edge) hide();
  });
  // Equivalent keyboard access without a permanently visible bar.
  edge.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === "ArrowDown" || event.key === " ") {
      event.preventDefault(); show(); header.querySelector("a")?.focus();
    }
  });
  doc.addEventListener("keydown", event => { if (event.key === "Escape") { hide(); edge.focus(); } });
  win.addEventListener("blur", hide);
  hide();
}