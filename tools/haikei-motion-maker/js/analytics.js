(() => {
  'use strict';

  const TOOL_ANALYTICS = Object.freeze({
    tool_id: 'haikei_motion_maker',
    tool_name: '背景モーションメーカー',
    tool_version: 'v1.02'
  });

  const ANALYTICS_DEBUG = false;
  const INPUT_STARTED_KEY = `${TOOL_ANALYTICS.tool_id}_input_started`;
  let toolOpenSent = false;
  let inputRevision = 0;
  const successKeys = new Set();
  let lastExceededOutput = null;
  let retryCountAfterExceeded = 0;

  function getLanguage() {
    const lang = String(document.documentElement.lang || 'ja').toLowerCase();
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('en')) return 'en';
    return 'ja';
  }

  function getDeviceLayout() {
    const width = window.innerWidth || document.documentElement.clientWidth || 1280;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  function sendToolEvent(eventName, parameters = {}) {
    const payload = {
      tool_id: TOOL_ANALYTICS.tool_id,
      tool_name: TOOL_ANALYTICS.tool_name,
      tool_version: TOOL_ANALYTICS.tool_version,
      language: getLanguage(),
      device_layout: getDeviceLayout(),
      ...parameters
    };

    if (ANALYTICS_DEBUG) {
      console.info('[GA4 Event]', eventName, payload);
    }

    if (typeof window.gtag !== 'function') return;

    try {
      window.gtag('event', eventName, payload);
    } catch (error) {
      if (ANALYTICS_DEBUG) console.warn('[GA4 Event Error]', error);
    }
  }

  function sendToolOpen() {
    if (toolOpenSent) return;
    toolOpenSent = true;
    sendToolEvent('tool_open');
  }

  function markInputStarted(parameters = {}) {
    try {
      if (sessionStorage.getItem(INPUT_STARTED_KEY) === '1') return;
      sessionStorage.setItem(INPUT_STARTED_KEY, '1');
    } catch (_) {
      if (markInputStarted.sent) return;
      markInputStarted.sent = true;
    }
    sendToolEvent('tool_input_started', parameters);
  }

  function markInputChanged() {
    inputRevision += 1;
  }

  function sendFeature(featureId, featureName, actionType, optionValue) {
    const parameters = {
      feature_id: featureId,
      feature_name: featureName,
      action_type: actionType
    };
    if (optionValue !== undefined && optionValue !== null && optionValue !== '') {
      parameters.option_value = optionValue;
    }
    sendToolEvent('feature_used', parameters);
  }

  function sendSuccessOnce(signature, parameters) {
    const key = `${inputRevision}:${signature}`;
    if (successKeys.has(key)) return false;
    successKeys.add(key);
    sendToolEvent('tool_success', parameters);
    return true;
  }

  function sendImport(parameters) {
    sendToolEvent('import_used', parameters);
  }

  function sendExport(parameters) {
    sendToolEvent('export_click', parameters);
  }

  function sendShare(parameters) {
    sendToolEvent('share_click', parameters);
  }

  function sendError(parameters) {
    sendToolEvent('tool_error', parameters);
  }

  function sendReset(parameters) {
    sendToolEvent('reset_used', parameters);
    markInputChanged();
  }

  function sendHelp(parameters) {
    sendToolEvent('help_open', parameters);
  }

  function getRetryChangeType(previous, current) {
    const changed = [];
    if (previous.quality_id !== current.quality_id) changed.push('quality');
    if (previous.output_size_id !== current.output_size_id) changed.push('output_size');
    if (previous.output_fps !== current.output_fps) changed.push('fps');
    if (previous.duration_bucket !== current.duration_bucket) changed.push('duration');
    if (previous.motion_id !== current.motion_id) changed.push('motion');
    if (previous.image_effect_id !== current.image_effect_id) changed.push('image_effect');
    if (!changed.length) return 'no_change';
    return changed.length === 1 ? changed[0] : 'multiple';
  }

  function resetOutputTracking() {
    lastExceededOutput = null;
    retryCountAfterExceeded = 0;
  }

  function recordOutputResult(parameters) {
    const payload = { ...parameters };
    sendToolEvent('webp_output_result', payload);

    if (lastExceededOutput) {
      retryCountAfterExceeded += 1;
      const retryChangeType = getRetryChangeType(lastExceededOutput, payload);
      sendToolEvent('output_retry_after_limit', {
        retry_count: retryCountAfterExceeded,
        retry_change_type: retryChangeType,
        previous_output_size_bucket: lastExceededOutput.output_size_bucket,
        current_output_size_bucket: payload.output_size_bucket,
        previous_output_fps: lastExceededOutput.output_fps,
        current_output_fps: payload.output_fps,
        previous_quality_id: lastExceededOutput.quality_id,
        current_quality_id: payload.quality_id,
        previous_output_size_id: lastExceededOutput.output_size_id,
        current_output_size_id: payload.output_size_id
      });

      if (!payload.exceeds_5mb) {
        sendToolEvent('output_limit_recovered', {
          retry_count: retryCountAfterExceeded,
          recovery_method: retryChangeType,
          previous_size_bucket: lastExceededOutput.output_size_bucket,
          recovered_size_bucket: payload.output_size_bucket,
          output_fps: payload.output_fps,
          quality_id: payload.quality_id,
          output_size_id: payload.output_size_id
        });
        resetOutputTracking();
      }
    }

    if (payload.exceeds_5mb) {
      sendToolEvent('output_size_exceeded', payload);
      lastExceededOutput = { ...payload };
    }
  }

  window.ToolAnalytics = Object.freeze({
    config: TOOL_ANALYTICS,
    sendToolEvent,
    sendToolOpen,
    markInputStarted,
    markInputChanged,
    sendFeature,
    sendSuccessOnce,
    sendImport,
    sendExport,
    sendShare,
    sendError,
    sendReset,
    sendHelp,
    recordOutputResult,
    resetOutputTracking,
    getDeviceLayout
  });

  // UI operations that do not require access to tool-internal state.
  document.getElementById('xShareLink')?.addEventListener('click', () => {
    sendShare({ share_target: 'x', share_type: 'social_post' });
  });

  document.getElementById('helpBtn')?.addEventListener('click', () => {
    const drawer = document.getElementById('helpDrawer');
    if (drawer?.hidden) sendHelp({ help_type: 'usage_guide', open_method: 'button' });
  });

  document.getElementById('shortcutBtn')?.addEventListener('click', () => {
    const drawer = document.getElementById('shortcutDrawer');
    if (drawer?.hidden) sendHelp({ help_type: 'shortcut_list', open_method: 'button' });
  });

  document.querySelectorAll('[data-lang-choice]').forEach(button => {
    button.addEventListener('click', () => {
      const lang = button.dataset.langChoice;
      if (!['ja', 'en', 'ko'].includes(lang)) return;
      sendFeature('language_switch', 'language_switch', 'select', lang);
    });
  });

  document.getElementById('themeBtn')?.addEventListener('click', () => {
    queueMicrotask(() => {
      const theme = document.body.classList.contains('is-dark') ? 'dark' : 'light';
      sendFeature('theme_switch', 'theme_switch', 'toggle', theme);
    });
  });

  document.getElementById('motionTab')?.addEventListener('click', () => {
    sendFeature('effect_panel', 'effect_panel', 'select', 'motion');
  });
  document.getElementById('imageEditTab')?.addEventListener('click', () => {
    sendFeature('effect_panel', 'effect_panel', 'select', 'image_edit');
  });

  document.getElementById('effectGrid')?.addEventListener('click', event => {
    const card = event.target.closest('.effect-card');
    if (!card?.dataset.effect) return;
    markInputChanged();
    sendFeature('motion_effect', 'motion_effect', 'select', card.dataset.effect);
  });

  document.getElementById('imageEditGrid')?.addEventListener('click', event => {
    const card = event.target.closest('.image-edit-card');
    if (!card?.dataset.filter) return;
    markInputChanged();
    sendFeature('image_filter', 'image_filter', 'select', card.dataset.filter);
  });

  const settingMap = {
    secondsInput: ['output_setting', 'duration', null],
    qualityInput: ['output_setting', 'quality', element => element.value],
    sizeInput: ['output_setting', 'image_size', element => `size_${String(element.value).replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`],
    loopInput: ['output_setting', 'loop', element => element.checked ? 'enabled' : 'disabled']
  };

  Object.entries(settingMap).forEach(([id, config]) => {
    const element = document.getElementById(id);
    element?.addEventListener('change', () => {
      markInputChanged();
      const optionValue = config[2] ? config[2](element) : undefined;
      sendFeature(config[0], config[1], 'change', optionValue);
    });
  });

  document.getElementById('playBtn')?.addEventListener('click', () => {
    queueMicrotask(() => {
      const playing = document.getElementById('playBtn')?.textContent?.toLowerCase().includes('stop')
        || document.getElementById('playBtn')?.textContent?.includes('停止')
        || document.getElementById('playBtn')?.textContent?.includes('정지');
      sendFeature('preview_playback', 'preview_playback', playing ? 'play' : 'stop');
    });
  });

  sendToolOpen();
})();
