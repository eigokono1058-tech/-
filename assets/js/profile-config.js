/* ==========================================================================
   プロフィール設定ファイル  ——  ここだけ書き換えれば完成します
   Profile config  ——  the only file you need to edit
   --------------------------------------------------------------------------
   * "REPLACE_ME" が残っているリンクはサイト上に表示されません
     （代わりに画面上部に「未設定」バナーが出ます）
   * { ja: "...", en: "..." } は日本語/英語の切り替え用。両方書いてください。
     海外の参加者が多いので、英語側を空にしないこと。
   * url も { ja: "...", en: "..." } にできます（言語別のページがある場合）
   * URL を書き換えたら QR も作り直すこと:
         python3 tools/gen_qr.py
   ========================================================================== */

window.PROFILE = {
  /* ---- 基本情報 / basics ---------------------------------------------- */
  name: "Eigo Kono",   // ローマ字表記 / romanized name
  nameJa: "河野 瑛吾", // 日本語表記
  nickname: "Ayden",   // 呼ばれ方（空にすると表示されません）

  role: {
    ja: "ITエンジニア / 営業 · 日立製作所 公共システム営業統括本部",
    en: "IT Engineer / Solution Sales · Public Sector Systems, Hitachi, Ltd."
  },

  // 名刺・ポスターの印刷に使う短い肩書き（長いと文字が小さくなるため）
  roleShort: {
    ja: "ITエンジニア / 営業 · 日立製作所",
    en: "IT Engineer / Solution Sales · Hitachi, Ltd."
  },

  location: { ja: "東京", en: "Tokyo, Japan" },

  // 顔写真（任意）。例: "assets/img/me.jpg" を置いてパスを書く。空ならイニシャル表示
  avatar: "",

  // 自己紹介1行（QRを読んだ人が最初に読む文）
  headline: {
    ja: "AIエージェント前提の社会インフラを、物流の「ラスト数メートル」から再設計しています。",
    en: "Redesigning infrastructure for a world of AI agents — starting with the last few meters of delivery."
  },

  // 興味・専門タグ / interests
  tags: {
    ja: ["AI Agent", "物流", "公共システム", "ServiceNow", "Dynatrace", "IT運用"],
    en: ["AI Agents", "Logistics", "Public Sector", "ServiceNow", "Dynatrace", "IT Operations"]
  },

  /* ---- 連絡先 / contact -----------------------------------------------
     公開サイトにメールを載せるとボットに収集されて迷惑メールが増えるので、
     既定では載せていません。載せる場合は下の行のコメントを外してください。
     携帯番号は公開ページには載せない方針にしています（名刺で直接渡す想定）。   */
  email: "",
  // email: "eigo.kono.pa@hitachi.com",

  // 連絡先カード(.vcf)のダウンロードボタンを出すか
  enableVCard: true,

  /* ---- リンク / links -------------------------------------------------
     order 順に表示。url に "REPLACE_ME" が含まれる項目は非表示になります。  */
  links: [
    {
      id: "hitachi",
      label: { ja: "日立での実績", en: "My work at Hitachi" },
      sublabel: {
        ja: "公開されている導入事例（業務AI）",
        en: "Published case study (in Japanese)"
      },
      // 英語版のページが見つかったら { ja: "...", en: "..." } に変えられます
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

  /* ---- 事業アイデア / the project ------------------------------------- */
  project: {
    codename: "LAST METERS",
    title: {
      ja: "AIが発注する時代の「受取」インフラ",
      en: "Receiving infrastructure for the age of AI agents"
    },
    summary: {
      ja: "AIエージェントが発注まで自動化しても、荷物は物理的に届く。その最後の受渡しは今も人間の在宅が前提。ここを機械同士の受渡しに置き換える権限・責任設計のレイヤーをつくる。",
      en: "Even when AI agents handle ordering end to end, goods still arrive physically — and receiving them still assumes a human is home. I am building the authorization and accountability layer that turns that handoff into a machine-to-machine one."
    },
    links: [
      {
        label: { ja: "動くデモを触る", en: "Try the live demo" },
        href: "./app/",
        cta: true,
        note: { ja: "ピンを差して受取先を変える", en: "Drop a pin, change where it lands" }
      },
      {
        label: { ja: "構想を読む（ピッチ）", en: "Read the pitch" },
        href: "./pitch/",
        note: { ja: "課題・市場・ビジネスモデル", en: "Problem, market, business model" }
      },
      {
        label: { ja: "事業計画ドキュメント", en: "Business plan docs" },
        href: "./plan/",
        note: { ja: "論点と検証計画", en: "Open questions & validation" }
      }
    ]
  },

  /* ---- 公開URL（QR生成のデフォルト値と共有ボタンに使用） -------------- */
  siteUrl: "https://eigokono1058-tech.github.io/-/"
};
