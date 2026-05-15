function enterScreenshotMode() {
  document.body.classList.add('screenshot-mode');
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

function exitScreenshotMode() {
  document.body.classList.remove('screenshot-mode');
}

function handleGlobalKeydown(event) {
  const key = String(event.key || '').toLowerCase();
  const isCommand = event.ctrlKey || event.metaKey;
  const isAltOnly = event.altKey && !event.ctrlKey && !event.metaKey;
  const isCommandShift = isCommand && event.shiftKey;
  const isScreenshotMode = document.body.classList.contains('screenshot-mode');
  const isModalOpen = typeof isShortcutModalOpen === 'function' && isShortcutModalOpen();

  if (event.key === 'Escape') {
    event.preventDefault();
    if (isModalOpen) return closeShortcutModal();
    if (isScreenshotMode) return exitScreenshotMode();
    if (window.confirm(tr('confirm.clear', '入力内容と抽出結果をクリアします。よろしいですか？'))) clearAll();
    return;
  }

  if (event.key === '?' && !isCommand && !event.altKey && !isTypingInEditableField()) {
    event.preventDefault();
    openShortcutModal();
    return;
  }

  if ((isAltOnly || isCommandShift) && key === 'o') {
    event.preventDefault();
    $('fileInput')?.click();
    return;
  }

  if (isCommand && event.key === 'Enter') {
    event.preventDefault();
    analyze();
    return;
  }

  if (isCommand && !event.shiftKey && key === 'l') {
    event.preventDefault();
    $('rawInput')?.focus();
    return;
  }

  if (isCommandShift && key === 'i') {
    event.preventDefault();
    toggleInputPanel();
    return;
  }

  if (isCommand && !event.shiftKey && key === '1') {
    event.preventDefault();
    activateTabByName('summary');
    return;
  }

  if (isCommand && !event.shiftKey && key === '2') {
    event.preventDefault();
    activateTabByName('candidates');
    return;
  }

  if (isCommand && !event.shiftKey && key === '3') {
    event.preventDefault();
    activateTabByName('rolls');
    return;
  }

  if (isCommandShift && key === 'c') {
    event.preventDefault();
    state.showCharacterControls = !state.showCharacterControls;
    renderCharacterControls();
    return;
  }

  if ((isAltOnly || isCommandShift) && key === 't') {
    event.preventDefault();
    toggleTheme();
    return;
  }

  if ((isAltOnly || isCommandShift) && (key === 's' || key === 'v')) {
    event.preventDefault();
    isScreenshotMode ? exitScreenshotMode() : enterScreenshotMode();
    return;
  }

  if (isCommand && event.key === 'Backspace') {
    event.preventDefault();
    if (window.confirm(tr('confirm.clear', '入力内容と抽出結果をクリアします。よろしいですか？'))) clearAll();
  }
}

function activateTabByName(tabName) {
  const targetButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
  if (targetButton) switchTab(targetButton);
}

function isTypingInEditableField() {
  const active = document.activeElement;
  if (!active) return false;
  const tagName = active.tagName ? active.tagName.toLowerCase() : '';
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || active.isContentEditable;
}

document.addEventListener('keydown', handleGlobalKeydown);
