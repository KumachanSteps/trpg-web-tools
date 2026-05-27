export const SAMPLE_CATEGORIES = {
  spell: ["召喚魔術", "退散・封印", "精神魔術", "戦闘", "防御", "夢", "治癒", "探索補助", "儀式", "その他"],
  grimoire: ["魔導書", "写本", "断章", "碑文", "巻物", "手記", "その他"],
  artifact: ["武器", "防具", "装飾品", "儀式道具", "仮面", "像", "鍵", "呪物", "その他"]
};

export const EMPTY_ITEM = {
  spell: {
    id: "",
    type: "spell",
    typeLabel: "呪文",
    icon: "✦",
    name: "新しい呪文",
    alternative_names: [],
    category: "その他",
    source: "",
    edition: "",
    page: "",
    cost_summary: "",
    casting_time_summary: "",
    effect_summary: "",
    keeper_note: "",
    pl_note: "",
    tags: [],
    audience: ["keeper"],
    full_text: "",
    updatedAt: "",
    favorite: false,
    scenarioEdited: false
  },
  grimoire: {
    id: "",
    type: "grimoire",
    typeLabel: "魔導書",
    icon: "▣",
    name: "新しい魔導書",
    alternative_names: [],
    category: "魔導書",
    source: "",
    edition: "",
    page: "",
    language_summary: "",
    reading_time_summary: "",
    contents_summary: "",
    included_spells: [],
    effect_summary: "",
    keeper_note: "",
    pl_note: "",
    tags: [],
    audience: ["keeper"],
    full_text: "",
    updatedAt: "",
    favorite: false,
    scenarioEdited: false
  },
  artifact: {
    id: "",
    type: "artifact",
    typeLabel: "アーティファクト",
    icon: "◆",
    name: "新しいアーティファクト",
    alternative_names: [],
    category: "その他",
    source: "",
    edition: "",
    page: "",
    appearance_summary: "",
    activation_summary: "",
    cost_summary: "",
    effect_summary: "",
    risk_summary: "",
    destruction_summary: "",
    keeper_note: "",
    pl_note: "",
    tags: [],
    audience: ["keeper"],
    full_text: "",
    updatedAt: "",
    favorite: false,
    scenarioEdited: false
  }
};

export const TYPE_LABELS = {
  spell: "呪文",
  grimoire: "魔導書",
  artifact: "アーティファクト"
};

export const TYPE_ICONS = {
  spell: "✦",
  grimoire: "▣",
  artifact: "◆"
};
