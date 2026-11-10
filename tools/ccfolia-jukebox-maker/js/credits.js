/* KPレス・ジュークボックスメーカー — BGMの配布元（「版権元」の BGM タブ）
 * レコード棚の初期の曲とプリセットの曲を、YouTube の投稿チャンネルごとにまとめたもの。
 * count はその配布元の曲数（棚とプリセットで重なる曲は1曲として数える）。site は確認できた公式サイトだけ。 */
(function () {
  'use strict';
  window.JukeboxBgmSources = [
    { name: "OpenTracks（旧DOVA-SYNDROME）", count: 245, channel: "https://www.youtube.com/@opentracksbgm", site: "https://opentracks.com/" },
    { name: "PeriTune", count: 24, channel: "https://www.youtube.com/@PeriTune", site: "https://peritune.com/" },
    { name: "もみじばミュージック", count: 13, channel: "https://www.youtube.com/@momiziba" },
    { name: "コニシユカ / nonai sound", count: 9, channel: "https://www.youtube.com/@yuconishi", site: "https://nonaisound.com/" },
    { name: "MATSU", count: 8, channel: "https://www.youtube.com/@matsubgm" },
    { name: "柊情景音楽店", count: 8, channel: "https://www.youtube.com/@HiiragiMusic" },
    { name: "Tak_mfk", count: 6, channel: "https://www.youtube.com/@Tak_mfk" },
    { name: "h/mix（秋山裕和）", count: 5, channel: "https://www.youtube.com/@hmixbgm", site: "https://www.hmix.net/" },
    { name: "たう", count: 4, channel: "https://www.youtube.com/@BGMusicJp" },
    { name: "zukisuzuki BGM", count: 3, channel: "https://www.youtube.com/@zukisuzukiBGM", site: "https://zukisuzukibgm.com/" },
    { name: "zippy", count: 2, channel: "https://www.youtube.com/@zippysound" },
    { name: "きりんちゃんねる", count: 2, channel: "https://www.youtube.com/@%E3%81%8D%E3%82%8A%E3%82%93%E3%81%A1%E3%82%83%E3%82%93%E3%81%AD%E3%82%8B-f8e" },
    { name: "魔王魂（森田交一）", count: 2, channel: "https://www.youtube.com/@koichi_maou", site: "https://maou.audio/" },
    { name: "BGMer", count: 1, channel: "https://www.youtube.com/@BGMer_net" },
    { name: "Hareno", count: 1, channel: "https://www.youtube.com/@hareno3368" },
    { name: "Kurage Sound", count: 1, channel: "https://www.youtube.com/@Kurage_GameMusic" },
    { name: "MusMus", count: 1, channel: "https://www.youtube.com/@musmusch", site: "https://musmus.main.jp/" },
    { name: "NoCopyrightSounds (NCS)", count: 1, channel: "https://www.youtube.com/@NoCopyrightSounds", site: "https://ncs.io/" },
    { name: "imataku Music", count: 1, channel: "https://www.youtube.com/@imatakumusic" },
    { name: "げきばん！", count: 1, channel: "https://www.youtube.com/@gekiban" },
    { name: "なぐもりずの音楽室", count: 1, channel: "https://www.youtube.com/@nagumorizu" },
    { name: "にゃるぱかBGM工房", count: 1, channel: "https://www.youtube.com/@NyalpacaBGM" },
    { name: "ねむいぬ", count: 1, channel: "https://www.youtube.com/@%E3%81%AD%E3%82%80%E3%81%84%E3%81%AC-x2r" },
    { name: "ふぁいの音楽置き場", count: 1, channel: "https://www.youtube.com/@fai_musics" },
    { name: "宇城和孝", count: 1, channel: "https://www.youtube.com/@ushirokazutaka" },
    { name: "西向く侍 / 369", count: 1, channel: "https://www.youtube.com/@369musiq" },
    { name: "鈴木何某 Nanigashi Suzuki", count: 1, channel: "https://www.youtube.com/@nanigashisuzuki" },
    { name: "音獅子 - Music Lion -", count: 2, channel: "https://www.youtube.com/@ryo_lion" }
  ];
})();
