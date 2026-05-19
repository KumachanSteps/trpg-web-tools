(() => {
  const STORAGE_KEY = "gm-charashi-viewer:v1";
  const formatPaletteToggle = document.getElementById("formatPaletteToggle");
  const deleteAllBtn = document.getElementById("deleteAllBtn");
  const viewerPanel = document.querySelector(".viewer-panel");
  const cardLane = document.getElementById("cardLane");
  const errorToast = document.getElementById("errorToast");
  const infoToast = document.getElementById("infoToast");
  const deleteModal = document.getElementById("deleteModal");
  const deleteText = document.getElementById("deleteText");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const copyModal = document.getElementById("copyModal");
  const copyTextArea = document.getElementById("copyTextArea");
  const closeCopyBtn = document.getElementById("closeCopyBtn");
  let pcs = loadCards();
  let draggedIndex = null;
  let isViewerHover = false;

  formatPaletteToggle.addEventListener("change", () => { pcs = pcs.map(pc => CharashiParser.rebuildPc(pc, formatPaletteToggle.checked)); saveCards(); renderCards(); });
  deleteAllBtn.addEventListener("click", openDeleteModal);
  cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  confirmDeleteBtn.addEventListener("click", deleteAllCards);
  closeCopyBtn.addEventListener("click", closeCopyModal);
  deleteModal.addEventListener("click", event => { if (event.target === deleteModal) closeDeleteModal(); });
  copyModal.addEventListener("click", event => { if (event.target === copyModal) closeCopyModal(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); clearAllCardsWithoutConfirm(); closeDeleteModal(); closeCopyModal(); } });
  viewerPanel.addEventListener("mouseenter", () => { isViewerHover = true; viewerPanel.classList.add("is-paste-ready"); });
  viewerPanel.addEventListener("mouseleave", () => { isViewerHover = false; viewerPanel.classList.remove("is-paste-ready"); });
  viewerPanel.addEventListener("dragover", event => { event.preventDefault(); viewerPanel.classList.add("is-paste-ready"); });
  viewerPanel.addEventListener("dragleave", () => { if (!isViewerHover) viewerPanel.classList.remove("is-paste-ready"); });
  viewerPanel.addEventListener("drop", event => { event.preventDefault(); viewerPanel.classList.remove("is-paste-ready"); if (draggedIndex !== null) return; const text = event.dataTransfer.getData("text/plain"); if (text) importCharacterData(text); });
  document.addEventListener("paste", event => { if (!isViewerHover) return; const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : ""; if (activeTag === "input" || activeTag === "textarea") return; const text = event.clipboardData ? event.clipboardData.getData("text/plain") : ""; if (!text.trim()) return; event.preventDefault(); importCharacterData(text); });

  function importCharacterData(rawText) {
    hideToast(errorToast);
    try { const parsed = JSON.parse(rawText.trim()); const list = Array.isArray(parsed) ? parsed : [parsed]; pcs.push(...list.map(item => CharashiParser.normalizeCharacterData(item, formatPaletteToggle.checked))); saveCards(); renderCards(); }
    catch (error) { showToast(errorToast, error.message || "いあきゃらのコマ出力データとして読み込めませんでした。"); }
  }

  function renderCards() { cardLane.innerHTML = ""; pcs = pcs.map(pc => CharashiParser.rebuildPc(pc, formatPaletteToggle.checked)); pcs.forEach((pc, index) => cardLane.appendChild(createCard(pc, index))); saveCards(); bindCardButtons(); }

  function createCard(pc, index) {
    const card = document.createElement("article"); card.className = "pc-card"; card.draggable = true; card.innerHTML = renderCardContent(pc);
    card.addEventListener("dragstart", () => { draggedIndex = index; card.classList.add("dragging"); });
    card.addEventListener("dragend", () => { draggedIndex = null; card.classList.remove("dragging"); });
    card.addEventListener("dragover", event => event.preventDefault());
    card.addEventListener("drop", event => { event.preventDefault(); event.stopPropagation(); if (draggedIndex === null || draggedIndex === index) return; const moved = pcs.splice(draggedIndex, 1)[0]; pcs.splice(index, 0, moved); saveCards(); renderCards(); });
    return card;
  }

  function renderCardContent(pc) {
    return `<header class="pc-card-header"><img class="pc-icon" src="${escapeAttr(pc.iconUrl || "https://placehold.co/300x300/e5e7eb/6b7280?text=%E7%94%BB%E5%83%8F%E3%81%AA%E3%81%97")}" alt="${escapeAttr(pc.name)}" /><div class="pc-name-block"><h3 class="pc-name">${escapeHtml(pc.name)}</h3><div class="pc-meta-row">${editionBadge(pc)}${sheetLink(pc)}</div></div><span class="drag-handle" title="ドラッグして並び替え">⋮⋮</span></header><div class="pc-card-body"><div class="stat-block status-grid">${CharashiParser.MAIN_STATUS.map(key => statusChip(key, CharashiParser.currentValue(pc.status[key]))).join("")}</div><div class="stat-block params-grid">${CharashiParser.PARAMS.map(key => paramChip(key, CharashiParser.paramValue(pc, key))).join("")}</div><div class="stat-block common-grid">${[["アイデア", CharashiParser.commonSkillValue(pc, "アイデア")],["知識", CharashiParser.commonSkillValue(pc, "知識")],["幸運", CharashiParser.commonSkillValue(pc, "幸運")]].map(([label, value]) => statusChip(label, value)).join("")}</div><div class="section-label"><span>技能</span><span>${pc.skills.length}件</span></div><div class="skill-list">${pc.skills.length ? pc.skills.map(skillRow).join("") : `<div class="skill-row skill-empty"><span class="skill-name">技能なし</span><span class="skill-value">-</span></div>`}</div><div class="section-label">チャットパレット</div><details><summary>整形済みチャットパレット</summary><pre class="palette-box">${escapeHtml(pc.chatPalette)}</pre></details></div><footer class="card-footer"><button class="btn-soft" data-action="copy" data-id="${escapeAttr(pc.id)}" type="button">チャパレコピー</button><button class="btn-soft" data-action="copy-koma" data-id="${escapeAttr(pc.id)}" type="button">コマ出力データコピー</button><button class="btn-danger wide-action" data-action="delete" data-id="${escapeAttr(pc.id)}" type="button">削除</button></footer>`;
  }

  function editionBadge(pc) { const edition = CharashiParser.detectEdition(pc); return `<span class="edition-badge edition-${edition}">${edition}版</span>`; }
  function sheetLink(pc) { if (!pc.externalUrl) return ""; return `<a class="sheet-link" href="${escapeAttr(pc.externalUrl)}" target="_blank" rel="noopener noreferrer">🔗キャラシ</a>`; }
  function statusChip(label, value) { return `<div class="status-chip"><span class="chip-label">${escapeHtml(label)}</span><span class="chip-value">${escapeHtml(value || "-")}</span></div>`; }
  function paramChip(label, value) { return `<div class="param-chip"><span class="chip-label">${escapeHtml(label)}</span><span class="chip-value">${escapeHtml(value || "-")}</span></div>`; }
  function skillRow(skill) { return `<div class="skill-row"><span class="skill-name">${escapeHtml(skill.name || "不明")}</span><span class="skill-value">${escapeHtml(skill.value ?? "-")}</span></div>`; }

  function bindCardButtons() {
    cardLane.querySelectorAll("button[data-action='delete']").forEach(button => { button.addEventListener("click", () => { pcs = pcs.filter(pc => pc.id !== button.dataset.id); saveCards(); renderCards(); }); });
    cardLane.querySelectorAll("button[data-action='copy']").forEach(button => { button.addEventListener("click", async () => { const pc = pcs.find(item => item.id === button.dataset.id); if (pc) showCopyResult(button, await copyToClipboard(pc.chatPalette)); }); });
    cardLane.querySelectorAll("button[data-action='copy-koma']").forEach(button => { button.addEventListener("click", async () => { const pc = pcs.find(item => item.id === button.dataset.id); if (pc) showCopyResult(button, await copyToClipboard(CharashiParser.copyableCharacterData(pc))); }); });
  }

  async function copyToClipboard(text) {
    const value = String(text ?? "");
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function" && window.isSecureContext) { try { await navigator.clipboard.writeText(value); return true; } catch (error) { console.warn(error); } }
    try { const textarea = document.createElement("textarea"); textarea.value = value; textarea.readOnly = true; textarea.style.position = "fixed"; textarea.style.left = "-9999px"; document.body.appendChild(textarea); textarea.focus(); textarea.select(); const copied = document.execCommand("copy"); document.body.removeChild(textarea); if (copied) return true; } catch (error) { console.warn(error); }
    openCopyModal(value); return false;
  }

  function showCopyResult(button, copied) { const original = button.textContent; button.textContent = copied ? "コピー済み" : "手動コピー"; if (!copied) showToast(infoToast, "Clipboard APIがブロックされたため、手動コピー用のダイアログを開きました。"); setTimeout(() => { button.textContent = original; }, 1000); }
  function openDeleteModal() { deleteText.textContent = pcs.length ? `${pcs.length}件のPCカードをすべて削除します。この操作は取り消せません。` : "現在PCカードはありません。保存データを空にします。この操作は取り消せません。"; deleteModal.classList.add("is-open"); deleteModal.setAttribute("aria-hidden", "false"); confirmDeleteBtn.focus(); }
  function closeDeleteModal() { closeModal(deleteModal); }
  function deleteAllCards() { pcs = []; localStorage.removeItem(STORAGE_KEY); renderCards(); closeDeleteModal(); }
  function clearAllCardsWithoutConfirm() { pcs = []; localStorage.removeItem(STORAGE_KEY); renderCards(); showToast(infoToast, "PCカードをすべて削除しました。"); }
  function openCopyModal(text) { copyTextArea.value = text; copyModal.classList.add("is-open"); copyModal.setAttribute("aria-hidden", "false"); copyTextArea.focus(); copyTextArea.select(); }
  function closeCopyModal() { closeModal(copyModal); }
  function closeModal(modal) { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); }
  function showToast(target, message) { target.textContent = message; target.style.display = "block"; clearTimeout(target.timer); target.timer = setTimeout(() => hideToast(target), 4200); }
  function hideToast(target) { target.textContent = ""; target.style.display = "none"; }
  function saveCards() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pcs)); } catch (error) { console.warn(error); showToast(errorToast, "保存に失敗しました。ブラウザのlocalStorage制限を確認してください。"); } }
  function loadCards() { try { const saved = localStorage.getItem(STORAGE_KEY); const parsed = saved ? JSON.parse(saved) : []; return Array.isArray(parsed) ? parsed.map(pc => CharashiParser.rebuildPc(pc, formatPaletteToggle.checked)) : []; } catch (error) { console.warn(error); return []; } }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[char])); }
  function escapeAttr(value) { return escapeHtml(value); }

  renderCards();
})();
