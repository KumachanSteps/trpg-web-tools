(function () {
  const STORAGE_KEY = "trpg-chara-libra-v1";
  const RECENT_DAYS = 14;

  let characters = [];
  let currentId = "";
  let currentView = "icon";

  const $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char],
    );

  const memoLabels = {
    profile: "プロフィール",
    items: "持ち物",
    combat: "戦闘メモ",
    relationships: "人間関係",
    scenarios: "通過シナリオ",
    free: "自由メモ",
    secret: "秘匿メモ",
  };

  function load() {
    try {
      characters = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      characters = [];
    }
  }

  function saveStore() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  }

  function fmt(dateText) {
    return dateText
      ? new Intl.DateTimeFormat("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(dateText))
      : "未取込";
  }

  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 2200);
  }

  function getStat(character, key) {
    return character.stats?.[key]?.value ?? character.stats?.[key] ?? "-";
  }

  function getSystemLabel(character) {
    return [character.system, character.edition].filter(Boolean).join(" / ") || "System未設定";
  }

  function findMatch(candidate) {
    return characters.find(
      (character) =>
        (candidate.externalUrl && character.externalUrl === candidate.externalUrl) ||
        character.name === candidate.name,
    );
  }

  function mergeCharacter(oldCharacter, newCharacter) {
    return {
      ...oldCharacter,
      ...newCharacter,
      id: oldCharacter.id,
      timestamps: {
        ...oldCharacter.timestamps,
        updatedAt: new Date().toISOString(),
        ccfoliaImportedAt: new Date().toISOString(),
        iacharaImportedAt: oldCharacter.timestamps?.iacharaImportedAt || "",
      },
      source: {
        ccfoliaRaw: newCharacter.source.ccfoliaRaw,
        iacharaText: oldCharacter.source?.iacharaText || "",
      },
    };
  }

  function importCcf() {
    try {
      const candidate = CharaLibraParser.fromCcf($("ccfoliaInput").value);
      const targetId = $("updateTarget").value;
      const matched = findMatch(candidate);
      const index = targetId
        ? characters.findIndex((character) => character.id === targetId)
        : characters.findIndex((character) => character.id === matched?.id);

      if (index >= 0) {
        characters[index] = mergeCharacter(characters[index], candidate);
        currentId = characters[index].id;
        toast("既存キャラクターを更新しました");
      } else {
        characters.unshift(candidate);
        currentId = candidate.id;
        toast("キャラクターを登録しました");
      }

      saveStore();
      renderLibrary();
      $("ccfoliaInput").value = "";
    } catch (error) {
      toast(`JSON解析に失敗しました: ${error.message}`);
    }
  }

  async function pasteFromClipboard() {
    try {
      $("ccfoliaInput").value = await navigator.clipboard.readText();
      toast("クリップボードから入力しました");
    } catch {
      toast("クリップボードを読み取れませんでした");
    }
  }

  function clearInput() {
    $("ccfoliaInput").value = "";
    $("updateTarget").value = "";
  }

  function resetFilters() {
    ["keywordFilter", "tagFilter", "occupationFilter"].forEach((id) => {
      $(id).value = "";
    });
    $("systemFilter").value = "";
    $("statusFilter").value = "";
    $("sortSelect").value = "updatedDesc";
    renderLibrary();
  }

  function filtered() {
    let result = [...characters];
    const keyword = $("keywordFilter").value.trim().toLowerCase();
    const system = $("systemFilter").value;
    const status = $("statusFilter").value;
    const tag = $("tagFilter").value.trim().toLowerCase();
    const occupation = $("occupationFilter").value.trim().toLowerCase();

    result = result.filter((character) => {
      const searchableText = [
        character.name,
        character.reading,
        character.system,
        character.edition,
        character.occupation,
        (character.tags || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const systemText = [character.system, character.edition].join(" ").toLowerCase();
      const isOtherSystem = system === "その他" && !/(coc6|coc7|エモクロア)/i.test(systemText);

      return (
        (!keyword || searchableText.includes(keyword)) &&
        (!system || isOtherSystem || systemText.includes(system.toLowerCase())) &&
        (!status || character.lifeStatus === status) &&
        (!tag || (character.tags || []).join(" ").toLowerCase().includes(tag)) &&
        (!occupation || String(character.occupation || "").toLowerCase().includes(occupation))
      );
    });

    const stat = (character, key) => Number(getStat(character, key) || 0);
    const sort = $("sortSelect").value;
    result.sort((a, b) =>
      sort === "updatedAsc"
        ? new Date(a.timestamps.updatedAt) - new Date(b.timestamps.updatedAt)
        : sort === "nameAsc"
          ? a.name.localeCompare(b.name, "ja")
          : sort === "createdDesc"
            ? new Date(b.timestamps.createdAt) - new Date(a.timestamps.createdAt)
            : sort === "sanDesc"
              ? stat(b, "SAN") - stat(a, "SAN")
              : sort === "sanAsc"
                ? stat(a, "SAN") - stat(b, "SAN")
                : sort === "hpDesc"
                  ? stat(b, "HP") - stat(a, "HP")
                  : sort === "skillDesc"
                    ? (b.skills || []).length - (a.skills || []).length
                    : new Date(b.timestamps.updatedAt) - new Date(a.timestamps.updatedAt),
    );

    return result;
  }

  function renderMetrics() {
    const recentCutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
    $("metricTotal").textContent = characters.length;
    $("metricAlive").textContent = characters.filter((character) => character.lifeStatus === "alive").length;
    $("metricLost").textContent = characters.filter((character) => character.lifeStatus === "lost").length;
    $("metricRecent").textContent = characters.filter(
      (character) => new Date(character.timestamps?.updatedAt || 0).getTime() >= recentCutoff,
    ).length;
  }

  function renderUpdateTargets() {
    $("updateTarget").innerHTML =
      '<option value="">新規登録 / 自動判定</option>' +
      characters
        .map((character) => `<option value="${esc(character.id)}">${esc(character.name)}</option>`)
        .join("");
  }

  function renderIconCard(character) {
    return `
      <article class="character-icon-card" data-id="${esc(character.id)}">
        ${renderImage(character.iconUrl, "archive-icon", character.name)}
        <div class="archive-name">${esc(character.name)}</div>
        <div class="archive-meta">${esc(getSystemLabel(character))}</div>
        <span class="status-badge ${esc(character.lifeStatus)}">${esc(CharaLibraLanguage.life(character.lifeStatus))}</span>
      </article>
    `;
  }

  function renderCard(character) {
    const hp = getStat(character, "HP");
    const mp = getStat(character, "MP");
    const san = getStat(character, "SAN");

    return `
      <article class="character-card-card" data-id="${esc(character.id)}">
        ${renderImage(character.iconUrl, "card-icon", character.name)}
        <div>
          <div class="card-name">${esc(character.name)}</div>
          <div class="meta">${esc(getSystemLabel(character))} / ${esc(character.occupation || "職業未設定")}</div>
          <span class="status-badge ${esc(character.lifeStatus)}">${esc(CharaLibraLanguage.life(character.lifeStatus))}</span>
          <p class="card-stat-line">HP ${esc(hp)} / MP ${esc(mp)} / SAN ${esc(san)}</p>
          <div class="tag-list">${(character.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join("")}</div>
          <p class="meta">Updated: ${esc(fmt(character.timestamps.updatedAt))}</p>
        </div>
      </article>
    `;
  }

  function renderImage(src, className, name) {
    if (!src) {
      return `<div class="${className} icon-placeholder" aria-hidden="true">${esc((name || "?").slice(0, 1))}</div>`;
    }

    return `<img class="${className}" src="${esc(src)}" alt="${esc(name)}" onerror="this.outerHTML='<div class=&quot;${className} icon-placeholder&quot; aria-hidden=&quot;true&quot;>${esc((name || "?").slice(0, 1))}</div>'">`;
  }

  function renderLibrary() {
    const grid = $("cardGrid");
    const result = filtered();

    renderMetrics();
    renderUpdateTargets();
    $("countBadge").textContent = result.length;
    grid.className = `character-grid ${currentView}-view`;
    grid.innerHTML = result.length
      ? result.map((character) => (currentView === "icon" ? renderIconCard(character) : renderCard(character))).join("")
      : '<div class="empty-state"><div><strong>キャラクターがまだ登録されていません</strong><p>左のControl DockにCCFOLIA駒JSONを貼り付けてください。</p></div></div>';

    grid.querySelectorAll("[data-id]").forEach((element) => {
      element.addEventListener("click", () => showDetail(element.dataset.id));
    });
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll(".view-toggle-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === view);
    });
    renderLibrary();
  }

  function current() {
    return characters.find((character) => character.id === currentId);
  }

  function showDetail(id) {
    currentId = id;
    const character = current();
    if (!character) return;

    $("libraryView").classList.add("hidden");
    $("detailView").classList.remove("hidden");
    ["name", "reading", "system", "edition", "occupation"].forEach((key) => {
      $(`${key}Input`).value = character[key] || "";
    });
    $("lifeStatusInput").value = character.lifeStatus || "alive";
    $("tagsInput").value = (character.tags || []).join(", ");
    $("tachieInput").value = character.tachieUrl || "";
    $("iconInput").value = character.iconUrl || "";
    $("externalInput").value = character.externalUrl || "";
    $("detailIcon").src = character.iconUrl || "";
    $("commandsInput").value = character.commands || "";
    $("freshnessBox").innerHTML = `最終編集：${esc(fmt(character.timestamps.updatedAt))}<br>CCFOLIA JSON取込：${esc(fmt(character.timestamps.ccfoliaImportedAt))}<br>いあきゃらTXT取込：${esc(fmt(character.timestamps.iacharaImportedAt))}`;
    renderStats(character);
    renderSkills(character);
    renderMemo(character);
  }

  function renderStats(character) {
    $("statsGrid").innerHTML = CharaLibraParser.STAT_KEYS.map((key) => {
      const value = character.stats?.[key];
      const text = value && typeof value === "object" ? `${value.value}/${value.max}` : value ?? "-";
      return `<div class="stat-box"><b>${esc(key)}</b>${esc(text)}</div>`;
    }).join("");
  }

  function renderSkills(character) {
    const query = ($("skillSearch").value || "").toLowerCase();
    $("skillsList").innerHTML =
      (character.skills || [])
        .filter((skill) => !query || skill.name.toLowerCase().includes(query))
        .map((skill) => `<div class="skill"><span>${esc(skill.name)}</span><b>${esc(skill.value)}</b></div>`)
        .join("") || '<p class="hint">技能が抽出されていません。</p>';
  }

  function renderMemo(character) {
    $("memoEditors").innerHTML = Object.keys(memoLabels)
      .map(
        (key) => `<label class="memo-row"><input type="checkbox" data-memo-opt="${key}" ${character.memoExportOptions?.[key] ? "checked" : ""}> <b>${memoLabels[key]}を出力</b><textarea data-memo-key="${key}">${esc(character.memoSections?.[key] || "")}</textarea></label>`,
      )
      .join("");
  }

  function collectDetail() {
    const character = current();
    if (!character) return null;

    ["name", "reading", "system", "edition", "occupation"].forEach((key) => {
      character[key] = $(`${key}Input`).value.trim();
    });
    character.lifeStatus = $("lifeStatusInput").value;
    character.tags = $("tagsInput")
      .value.split(/[、,]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    character.tachieUrl = $("tachieInput").value.trim();
    character.iconUrl = $("iconInput").value.trim();
    character.externalUrl = $("externalInput").value.trim();
    character.commands = $("commandsInput").value;
    character.skills = CharaLibraParser.extractSkills(character.commands);
    character.memoSections = {};
    document.querySelectorAll("[data-memo-key]").forEach((element) => {
      character.memoSections[element.dataset.memoKey] = element.value;
    });
    character.memoExportOptions = {};
    document.querySelectorAll("[data-memo-opt]").forEach((element) => {
      character.memoExportOptions[element.dataset.memoOpt] = element.checked;
    });
    character.timestamps.updatedAt = new Date().toISOString();
    return character;
  }

  function saveDetail() {
    if (!currentId) return;
    collectDetail();
    saveStore();
    renderLibrary();
    showDetail(currentId);
    toast("保存しました");
  }

  function buildMemo(character) {
    return Object.keys(memoLabels)
      .filter((key) => character.memoExportOptions?.[key])
      .map((key) => (character.memoSections?.[key] ? `【${memoLabels[key]}】\n${character.memoSections[key]}` : ""))
      .filter(Boolean)
      .join("\n\n");
  }

  function buildCcf(character) {
    return JSON.stringify(
      {
        name: character.name,
        initiative: character.initiative || 0,
        externalUrl: character.externalUrl || "",
        iconUrl: character.iconUrl || "",
        commands: character.commands || "",
        memo: buildMemo(character),
        status: Object.entries(character.stats || {})
          .filter(([, value]) => value && typeof value === "object")
          .map(([label, value]) => ({ label, value: value.value, max: value.max })),
        params: Object.entries(character.stats || {})
          .filter(([, value]) => !value || typeof value !== "object")
          .map(([label, value]) => ({ label, value: String(value ?? "") })),
      },
      null,
      2,
    );
  }

  async function copyCcf() {
    const character = collectDetail();
    saveStore();
    const output = buildCcf(character);
    try {
      await navigator.clipboard.writeText(output);
      toast("CCFOLIA駒データをコピーしました");
      $("manualCopyNotice").classList.add("hidden");
      $("manualCopyArea").classList.add("hidden");
    } catch {
      $("manualCopyNotice").classList.remove("hidden");
      $("manualCopyArea").classList.remove("hidden");
      $("manualCopyArea").value = output;
    }
  }

  function download(name, text) {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  function init() {
    load();
    renderLibrary();

    $("importBtn").addEventListener("click", importCcf);
    $("clipboardBtn").addEventListener("click", pasteFromClipboard);
    $("clearInputBtn").addEventListener("click", clearInput);
    $("resetFiltersBtn").addEventListener("click", resetFilters);
    ["keywordFilter", "systemFilter", "statusFilter", "tagFilter", "occupationFilter", "sortSelect"].forEach((id) => {
      $(id).addEventListener("input", renderLibrary);
    });
    document.querySelectorAll(".view-toggle-btn").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });

    $("backBtn").addEventListener("click", () => {
      $("detailView").classList.add("hidden");
      $("libraryView").classList.remove("hidden");
      renderLibrary();
    });
    $("saveDetailBtn").addEventListener("click", saveDetail);
    $("copyCcfBtn").addEventListener("click", copyCcf);
    $("copyCommandsBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("commandsInput").value);
      toast("チャットパレットをコピーしました");
    });
    $("skillSearch").addEventListener("input", () => renderSkills(current()));
    $("exportOneBtn").addEventListener("click", () => download(`${current().name || "character"}.json`, JSON.stringify(current(), null, 2)));
    $("deleteBtn").addEventListener("click", () => {
      if (confirm("削除しますか？")) {
        characters = characters.filter((character) => character.id !== currentId);
        saveStore();
        $("backBtn").click();
      }
    });

    $("themeBtn").addEventListener("click", () => document.body.classList.toggle("light"));
    $("langBtn").addEventListener("click", () => {
      CharaLibraLanguage.toggle();
      renderLibrary();
    });
    $("xShareBtn").addEventListener("click", () => {
      open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent("Chara-Libra｜TRPG WEBツール観測所 でキャラクター情報を管理しました！")}&url=${encodeURIComponent("https://kumachansteps.github.io/trpg-web-tools/tools/chara-libra-tool/")}`,
        "_blank",
        "noopener",
      );
    });
    ["usageBtn", "shortcutBtn"].forEach((id) => {
      $(id).addEventListener("click", () => $(id === "usageBtn" ? "usagePanel" : "shortcutPanel").classList.toggle("open"));
    });
    document.querySelectorAll("[data-close-panel]").forEach((button) => {
      button.addEventListener("click", () => $(button.dataset.closePanel).classList.remove("open"));
    });

    CharaLibraShortcuts.init({
      escape: () => {
        document.querySelectorAll(".slide-panel").forEach((panel) => panel.classList.remove("open"));
        if (!$("detailView").classList.contains("hidden")) $("backBtn").click();
      },
      save: saveDetail,
      theme: () => $("themeBtn").click(),
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
