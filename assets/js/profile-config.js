/* ==========================================================================
   プロフィール設定ファイル  ——  ここだけ書き換えれば完成します
   Profile config  ——  the only file you need to edit
   --------------------------------------------------------------------------
   * "REPLACE_ME" が残っているリンクはサイト上に表示されません
     （代わりに画面上部に「未設定」バナーが出ます）
   * { ja: "...", en: "..." } は日本語/英語の切り替え用。両方書いてください。
     海外の参加者が多いので、英語側を空にしないこと。
   * URL を書き換えたら QR も作り直すこと:
         python3 tools/gen_qr.py --url https://<公開URL>
   ========================================================================== */

window.PROFILE = {
  /* ---- 基本情報 / basics ---------------------------------------------- */
  name: "REPLACE_ME", // ローマ字表記 / romanized name 例: "Eigo Kono"
  nameJa: "REPLACE_ME", // 日本語表記 例: "河野 英悟"

  role: {
    ja: "REPLACE_ME", // 例: "ITエンジニア / 日立製作所"
    en: "REPLACE_ME"  // e.g. "IT Engineer / Hitachi, Ltd."
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
    ja: ["AI Agent", "物流", "ServiceNow", "Dynatrace", "IT運用", "社会インフラ"],
    en: ["AI Agents", "Logistics", "ServiceNow", "Dynatrace", "IT Operations", "Infrastructure"]
  },

  /* ---- 連絡先 / contact ----------------------------------------------- */
  // 公開ページにメールを載せたい場合のみ記入（迷惑メール対策で既定は空）
  email: "",
  // 連絡先カード(.vcf)のダウンロードボタンを出すか
  enableVCard: true,

  /* ---- リンク / links -------------------------------------------------
     order 順に表示。url に "REPLACE_ME" が含まれる項目は非表示になります。  */
  links: [
    {
      id: "hitachi",
      label: { ja: "これまでの実績", en: "Work & Projects" },
      sublabel: { ja: "業務実績・取り組みの紹介", en: "What I have built at work" },
      url: "REPLACE_ME", // 例: "https://www.hitachi.co.jp/..." ※公開可能なURLのみ
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
      url: "REPLACE_ME", // 例: "https://www.linkedin.com/in/your-id/"
      icon: "linkedin",
      accent: "#4a9ae0"
    },
    {
      id: "instagram",
      label: { ja: "Instagram", en: "Instagram" },
      sublabel: { ja: "日常・イベント記録", en: "Everyday & events" },
      url: "REPLACE_ME", // 例: "https://www.instagram.com/your_id/"
      icon: "instagram",
      accent: "#e1548a"
    },
    {
      id: "facebook",
      label: { ja: "Facebook", en: "Facebook" },
      sublabel: { ja: "つながり申請はこちら", en: "Send me a request" },
      url: "REPLACE_ME", // 例: "https://www.facebook.com/your.id"
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
