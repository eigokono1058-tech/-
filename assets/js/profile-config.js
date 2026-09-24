/* ==========================================================================
   プロフィール設定ファイル  ——  ここだけ書き換えれば完成します
   Profile config  ——  the only file you need to edit
   --------------------------------------------------------------------------
   見せる場: OpenAI DevDay 2026 (Sep 29, 2026 / Fort Mason, San Francisco)
   既定の表示言語は英語（assets/js/i18n.js の DEFAULT_LANG で変更可）。

   * "REPLACE_ME" が残っているリンクはサイト上に表示されません
   * { ja: "...", en: "..." } は日本語/英語の切り替え用。両方書いてください
   * url も { ja: "...", en: "..." } にできます（言語別のページがある場合）
   * 名前・肩書き・URLを変えたら QR も作り直す: python3 tools/gen_qr.py
   ========================================================================== */

window.PROFILE = {
  /* ---- 基本情報 / basics ---------------------------------------------- */
  name: "Eigo Kono",   // ローマ字表記 / romanized name
  nameJa: "河野 瑛吾", // 日本語表記
  nickname: "Ayden",   // 呼ばれ方（空にすると表示されません）

  /* 部署が変わったため、特定の本部名は書いていません。
     いまの所属に合わせて書き換えてください（名刺の表記は
     「ITエンジニア / 営業 · 日立製作所 公共システム営業統括本部」でした）。 */
  role: {
    ja: "ITエンジニア / 営業 · 日立製作所",
    en: "IT Engineer / Solution Sales · Hitachi, Ltd."
  },

  // 名刺・ポスターの印刷に使う短い肩書き（長いと文字が小さくなるため）
  roleShort: {
    ja: "ITエンジニア / 営業 · 日立製作所",
    en: "IT Engineer / Solution Sales · Hitachi, Ltd."
  },

  location: { ja: "東京", en: "Tokyo, Japan" },

  // 顔写真（任意）。例: "assets/img/me.jpg" を置いてパスを書く。空ならイニシャル表示
  avatar: "",

  /* 自己紹介1行 = DevDayに提出した「What are you building?」と同じ内容にしている。
     メンターが読んでいる文章と食い違わせないため。 */
  headline: {
    ja: "日本の不在配送・再配達を減らしたい。荷物が、住所ではなく「受け取れる時間と場所」に届くようにする。",
    en: "Reducing failed deliveries in Japan — so a parcel arrives when and where you can actually receive it, not at one fixed address."
  },

  // 名刺・ポスターの印刷に使う短いタグライン（長いと途中で切れるため）
  headlineShort: {
    ja: "受け取れる場所と時間に、荷物が届くようにする。",
    en: "Making parcels arrive where and when you can actually receive them."
  },

  /* ---- 連絡先 / contact -----------------------------------------------
     公開サイトにメールを載せるとボットに収集されて迷惑メールが増えるので、
     既定では載せていません。載せる場合は下の行のコメントを外してください。
     携帯番号は公開ページには載せない方針にしています（名刺で直接渡す想定）。   */
  email: "",
  // email: "eigo.kono.pa@hitachi.com",

  /* ---- リンク / links -------------------------------------------------
     order 順に表示。url に "REPLACE_ME" が含まれる項目は非表示になります。  */
  links: [
    {
      id: "hitachi",
      label: { ja: "日立での実績", en: "My work at Hitachi" },
      sublabel: {
        ja: "日立の公開記事",
        en: "A published article about my work (Japanese)"
      },
      // deh.hitachi.co.jp/_ct/17805441 と同じ記事です
      url: "https://www.hitachi.com/ja-jp/products/digital/highlights/usecases/gyoumu-ai/17805441",
      icon: "briefcase",
      accent: "#e0736f",
      featured: true
    },
    {
      id: "github",
      label: { ja: "GitHub", en: "GitHub" },
      sublabel: { ja: "コード・プロトタイプ", en: "Code & prototypes" },
      url: "https://github.com/eigokono1058-tech",
      icon: "github",
      accent: "#c9d1d9"
    },
    {
      id: "linkedin",
      label: { ja: "LinkedIn", en: "LinkedIn" },
      sublabel: { ja: "職歴・つながり", en: "Experience & connections" },
      // 日本語を含むURLなのでパーセントエンコード済み（古い環境でも確実に開くため）
      url: "https://www.linkedin.com/in/%E7%91%9B%E5%90%BE-%E6%B2%B3%E9%87%8E-5a74b52b7",
      icon: "linkedin",
      accent: "#4a9ae0"
    },
    {
      id: "x",
      label: { ja: "X", en: "X" },
      sublabel: { ja: "@otbvnkvqc5ngy17", en: "@otbvnkvqc5ngy17" },
      // 共有リンクに付く ?s= / ?t= は追跡用パラメータなので落としている
      url: "https://x.com/otbvnkvqc5ngy17",
      icon: "x",
      // Xのロゴは黒。暗い背景では沈んで見えなくなるので、本文の色に追従させる
      // （ダークテーマでは白、ライトテーマではほぼ黒になり、Xの見せ方とも合う）
      accent: "var(--text)"
    },
    {
      id: "instagram",
      label: { ja: "Instagram", en: "Instagram" },
      sublabel: { ja: "@eigokono", en: "@eigokono" },
      // ?hl=ja は付けない（海外の人が開いたときに日本語UIにならないように）
      url: "https://www.instagram.com/eigokono/",
      icon: "instagram",
      accent: "#e1548a"
    },
    {
      id: "facebook",
      label: { ja: "Facebook", en: "Facebook" },
      sublabel: { ja: "つながり申請はこちら", en: "Send me a request" },
      url: "https://www.facebook.com/profile.php?id=100023757078491",
      icon: "facebook",
      accent: "#5b8cff"
    }
  ],

  /* ---- プロジェクト / project -----------------------------------------
     DevDayに提出した「What are you building?」と同じ内容にしている。         */
  projects: [
    {
      codename: "DELIVERY OS",
      badge: { ja: "検討中 · 動く試作あり", en: "Exploring · working prototype" },
      title: {
        ja: "「受け取れない」をなくす、物流の受取体験",
        en: "A delivery experience built around when and where you can receive"
      },
      summary: {
        ja: "日本では対面での受け渡しが多く、受取人が不在だと再配達になる。自宅という固定された場所ではなく、「いつ・どこなら受け取れるか」に合わせて荷物が届く形にしたい。むずかしいのは、受け取る人の都合と配送側の都合を、どちらも成立する形で合わせることだと思っている。",
        en: "Japan still relies on direct handoffs, so a parcel becomes a redelivery whenever nobody is home. I want packages to arrive around when and where the recipient can actually be, instead of at one fixed address. The hard part is matching that flexibility with what delivery operations can absorb."
      },
      links: [
        {
          label: { ja: "動くデモを触る", en: "Try the live demo" },
          href: "./app/",
          cta: true,
          note: { ja: "ピンを差して受取先を変える", en: "Drop a pin, change where it lands" }
        },
        {
          label: { ja: "当日メンターにお伺いしたいこと", en: "What I want to ask my mentor" },
          href: "./launchpad/",
          note: { ja: "DevDay当日の質問", en: "For the DevDay session" }
        },
        {
          label: { ja: "構想を読む（ピッチ）", en: "Read the pitch" },
          href: "./pitch/",
          note: { ja: "課題・市場・ビジネスモデル", en: "Problem, market, business model" }
        },
]
    }
  ],

  /* ---- 公開URL（QR生成のデフォルト値と共有ボタンに使用） -------------- */
  siteUrl: "https://eigokono1058-tech.github.io/-/"
};
