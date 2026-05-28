function handleShortcuts(event) {
  if (
    event.key.toLowerCase() === "c" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    document.activeElement === parsedText &&
    parsedText.selectionStart !== parsedText.selectionEnd
  ) {
    event.preventDefault();
    createCardFromSelection();
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    return;
  }

  if (!(event.altKey || event.metaKey)) return;

  const targetSelect = document.activeElement?.closest?.(".right-panel")
    ? newCardType
    : selectionCardType;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    cycleInfoTypeSelect(targetSelect, event.key === "ArrowDown" ? 1 : -1);
    return;
  }

  const shortcutKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"];
  const shortcutIndex = shortcutKeys.indexOf(event.key);
  const typeKeys = Object.keys(INFO_TYPES);

  if (shortcutIndex === -1 || !typeKeys[shortcutIndex]) return;

  event.preventDefault();
  targetSelect.value = typeKeys[shortcutIndex];
  targetSelect.dispatchEvent(new Event("change"));
  showSelectedTypeStatus(targetSelect);
}

function cycleInfoTypeSelect(selectEl, direction) {
  const typeKeys = Object.keys(INFO_TYPES);
  const currentIndex = Math.max(0, typeKeys.indexOf(selectEl.value));
  const nextIndex = (currentIndex + direction + typeKeys.length) % typeKeys.length;

  selectEl.value = typeKeys[nextIndex];
  selectEl.dispatchEvent(new Event("change"));
  showSelectedTypeStatus(selectEl);
}

function showSelectedTypeStatus(selectEl) {
  const typeInfo = INFO_TYPES[selectEl.value] || INFO_TYPES.memo;
  const targetName = selectEl === newCardType ? "新規カード" : "選択カード";
  setStatus(`${targetName}: ${typeInfo.marker} ${typeInfo.label}`);
}
