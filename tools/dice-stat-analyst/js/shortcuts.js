function enterScreenshotMode() {
  document.body.classList.add('screenshot-mode');
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

function exitScreenshotMode() {
  document.body.classList.remove('screenshot-mode');
}

/*
  Keyboard Shortcuts / ショートカット設定

  Ctrl / Cmd + Shift + O
    → ファイル選択

  Ctrl / Cmd + Enter
    → 分析する

  Ctrl / Cmd + L
    → 入力欄にフォーカス

  Ctrl / Cmd + Shift + I
    → 入力パネル開閉

  Ctrl / Cmd + 1
    → キャラクター別サマリー

  Ctrl / Cmd + 2
    → 分布チャート

  Ctrl / Cmd + 3
    → 抽出ロール

  Ctrl / Cmd + Shift + C
    → 表示キャラ設定の開閉

  Ctrl / Cmd + Shift + T
    → ナイトモード切替

  Ctrl / Cmd + Shift + V
    → スクショ表示 / 通常表示

  Ctrl / Cmd + Backspace
    → 確認後クリア

  ?
    → ショートカット一覧を開く

  Esc
    → ショートカット一覧を閉じる / スクショ表示を閉じる / 通常時は確認後クリア
*/


function getScreenshotTargetElement() {
  return document.querySelector('body.screenshot-mode main') || document.querySelector('main');
}

function prepareScreenshotCaptureMode() {
  const wasScreenshotMode = document.body.classList.contains('screenshot-mode');

  if (!wasScreenshotMode) {
    enterScreenshotMode();
  }

  const memoCard = document.querySelector('#summaryMemo')?.closest('.card');
  if (memoCard) {
    memoCard.classList.add('screenshot-hidden-memo');
  }

  return {
    wasScreenshotMode,
    cleanup() {
      if (memoCard) {
        memoCard.classList.remove('screenshot-hidden-memo');
      }

      if (!wasScreenshotMode) {
        exitScreenshotMode();
      }
    }
  };
}

async function captureScreenshotCanvas() {
  const mode = prepareScreenshotCaptureMode();

  try {
    await waitForAnimationFrame();

    if (typeof html2canvas !== 'function') {
      throw new Error('html2canvas is not loaded. Please check the CDN script tag.');
    }

    const target = getScreenshotTargetElement();

    if (!target) {
      throw new Error('Screenshot target was not found.');
    }

    return await html2canvas(target, {
      backgroundColor: document.body.classList.contains('dark') ? '#0f172a' : '#ffffff',
      scale: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
      useCORS: true,
      allowTaint: false,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight
    });
  } finally {
    mode.cleanup();
  }
}

function waitForAnimationFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create PNG blob.'));
    }, 'image/png');
  });
}

function getScreenshotFileName() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('');
  return `dice-stat-analyst-${stamp}.png`;
}

async function downloadScreenshotView() {
  try {
    setScreenshotActionBusy(true);
    showScreenshotStatus(tr('screenshot.downloadWorking', 'スクショ画像を生成しています...'), 'success');

    const canvas = await captureScreenshotCanvas();
    const blob = await canvasToBlob(canvas);
    const url = URL.createObjectURL(blob);

    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = getScreenshotFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      URL.revokeObjectURL(url);
    }

    showScreenshotStatus(tr('screenshot.downloadSuccess', 'スクショ画像をダウンロードしました。'), 'success');
  } catch (error) {
    console.error(error);
    showScreenshotStatus(tr('screenshot.downloadError', 'ダウンロードに失敗しました。ブラウザ設定をご確認ください。'), 'error');
  } finally {
    setScreenshotActionBusy(false);
  }
}

async function copyScreenshotView() {
  try {
    setScreenshotActionBusy(true);
    showScreenshotStatus(tr('screenshot.copyWorking', 'スクショ画像をコピーしています...'), 'success');

    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      throw new Error('Clipboard image copy is not supported in this browser.');
    }

    const canvas = await captureScreenshotCanvas();
    const blob = await canvasToBlob(canvas);

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);

    showScreenshotStatus(tr('screenshot.copySuccess', 'スクショ画像をクリップボードにコピーしました。'), 'success');
  } catch (error) {
    console.error(error);
    showScreenshotStatus(tr('screenshot.copyError', 'コピーに失敗しました。Chrome / Edgeなど対応ブラウザでお試しください。'), 'error');
  } finally {
    setScreenshotActionBusy(false);
  }
}

async function postScreenshotToX() {
  try {
    setScreenshotActionBusy(true);
    showScreenshotStatus(tr('screenshot.xWorking', '画像をコピーしてX投稿画面を開きます...'), 'success');

    let copied = false;

    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const canvas = await captureScreenshotCanvas();
        const blob = await canvasToBlob(canvas);

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);

        copied = true;
      }
    } catch (copyError) {
      console.warn(copyError);
    }

    const text = encodeURIComponent('ダイス統計アナライザーでセッションログを解析しました。 #TRPG');
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');

    showScreenshotStatus(
      copied
        ? tr('screenshot.xSuccess', '画像をコピーしました。X投稿画面で貼り付けてください。')
        : tr('screenshot.xCopyFallback', 'X投稿画面を開きました。画像は手動で添付してください。'),
      copied ? 'success' : 'error'
    );
  } catch (error) {
    console.error(error);
    showScreenshotStatus(tr('screenshot.xError', 'X投稿画面を開けませんでした。'), 'error');
  } finally {
    setScreenshotActionBusy(false);
  }
}

function setScreenshotActionBusy(isBusy) {
  ['screenshotPostXBtn', 'screenshotDownloadBtn', 'screenshotCopyBtn'].forEach(id => {
    const button = $(id);
    if (button) {
      button.disabled = isBusy;
      button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    }
  });
}

function showScreenshotStatus(message, type = 'success') {
  const status = $('screenshotStatus');
  if (!status) return;

  status.textContent = message;
  status.classList.remove('success', 'error', 'visible');
  status.classList.add(type === 'error' ? 'error' : 'success', 'visible');

  window.clearTimeout(showScreenshotStatus.timer);
  showScreenshotStatus.timer = window.setTimeout(() => {
    status.classList.remove('visible');
  }, 4200);
}


function handleGlobalKeydown(event) {
  const key = String(event.key || '').toLowerCase();
  const isCommand = event.ctrlKey || event.metaKey;
  const isAltOnly = event.altKey && !event.ctrlKey && !event.metaKey;
  const isCommandShift = isCommand && event.shiftKey;
  const isScreenshotMode = document.body.classList.contains('screenshot-mode');
  const isModalOpen = typeof isShortcutModalOpen === 'function' && isShortcutModalOpen();

  /*
    Esc:
    1. ショートカットモーダルが開いていれば閉じる
    2. スクショ表示中なら通常表示へ戻す
    3. 通常時は確認後クリア
  */
  if (event.key === 'Escape') {
    event.preventDefault();

    if (isModalOpen) {
      closeShortcutModal();
      return;
    }

    if (isScreenshotMode) {
      exitScreenshotMode();
      return;
    }

    const confirmed = window.confirm(tr('confirm.clear', '入力内容と解析結果をクリアします。よろしいですか？'));
    if (confirmed) {
      clearAll();
    }

    return;
  }

  /*
    ?:
    入力欄・数値欄にフォーカスしているときは、通常入力を優先する。
  */
  if (
    event.key === '?' &&
    !isCommand &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !isTypingInEditableField()
  ) {
    event.preventDefault();

    if (typeof openShortcutModal === 'function') {
      openShortcutModal();
    }

    return;
  }

  /*
    Ctrl / Cmd + Shift + O:
    ファイル選択
  */
  if ((isAltOnly || isCommandShift) && key === 'o') {
    event.preventDefault();
    $('fileInput').click();
    return;
  }

  /*
    Ctrl / Cmd + Enter:
    分析する
  */
  if (isCommand && event.key === 'Enter') {
    event.preventDefault();
    analyze();
    return;
  }

  /*
    Ctrl / Cmd + L:
    入力欄にフォーカス
  */
  if (isCommand && !event.shiftKey && key === 'l') {
    event.preventDefault();
    $('rawInput').focus();
    return;
  }

  /*
    Ctrl / Cmd + Shift + I:
    入力パネル開閉
  */
  if (isCommandShift && key === 'i') {
    event.preventDefault();
    toggleInputPanel();
    return;
  }

  /*
    Ctrl / Cmd + 1:
    キャラクター別サマリー
  */
  if (isCommand && !event.shiftKey && key === '1') {
    event.preventDefault();
    activateTabByName('summary');
    return;
  }

  /*
    Ctrl / Cmd + 2:
    分布チャート
  */
  if (isCommand && !event.shiftKey && key === '2') {
    event.preventDefault();
    activateTabByName('chart');
    return;
  }

  /*
    Ctrl / Cmd + 3:
    抽出ロール
  */
  if (isCommand && !event.shiftKey && key === '3') {
    event.preventDefault();
    activateTabByName('rolls');
    return;
  }

  /*
    Ctrl / Cmd + Shift + C:
    表示キャラ設定の開閉
  */
  if (isCommandShift && key === 'c') {
    event.preventDefault();
    state.showCharacterControls = !state.showCharacterControls;
    renderCharacterControls();
    return;
  }

  /*
    Ctrl / Cmd + Shift + T:
    ナイトモード切替
  */
  if ((isAltOnly || isCommandShift) && key === 't') {
    event.preventDefault();
    toggleTheme();
    return;
  }

  /*
    Ctrl / Cmd + Shift + V:
    スクショ表示 / 通常表示
  */
  if ((isAltOnly || isCommandShift) && (key === 's' || key === 'v')) {
    event.preventDefault();

    if (isScreenshotMode) {
      exitScreenshotMode();
    } else {
      enterScreenshotMode();
    }

    return;
  }

  /*
    Ctrl / Cmd + Backspace:
    確認後クリア
  */
  if (isCommand && event.key === 'Backspace') {
    event.preventDefault();

    const confirmed = window.confirm(tr('confirm.clear', '入力内容と解析結果をクリアします。よろしいですか？'));

    if (confirmed) {
      clearAll();
    }
  }
}

function activateTabByName(tabName) {
  const targetButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
  if (!targetButton) return;

  switchTab(targetButton);
}

function isTypingInEditableField() {
  const active = document.activeElement;
  if (!active) return false;

  const tagName = active.tagName ? active.tagName.toLowerCase() : '';

  return tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || active.isContentEditable;
}
