/* ==========================================================================
   プロフィール設定ファイル  ——  ここだけ書き換えれば完成します
   --------------------------------------------------------------------------
   "REPLACE_ME" が残っているリンクはサイト上に表示されません（代わりに画面
   上部に「未設定」バナーが出ます）。イベント当日までに全部埋めてください。

   URL を書き換えたら QR も作り直すこと:
       python3 tools/gen_qr.py --url https://<公開URL>
   ========================================================================== */

window.PROFILE = {
  /* ---- 基本情報 ------------------------------------------------------- */
  name: "REPLACE_ME", // 例: "Eigo Kono"（ローマ字表記／名刺と揃える）
  nameJa: "REPLACE_ME", // 例: "河野 英悟"
  role: "REPLACE_ME", // 例: "ITエンジニア / 日立製作所"
  location: "Tokyo, Japan",

  // 顔写真（任意）。例: "assets/img/me.jpg" を置いてパスを書く。空ならイニシャル表示
  avatar: "",

  // 自己紹介1行（QRを読んだ人が最初に読む文。30〜60字が読みやすい）
  headline: "AIエージェント前提の社会インフラを、物流の「ラスト数メートル」から再設計しています。",

  // 興味・専門タグ（自由に増減OK）
  tags: ["AI Agent", "物流 / Logistics", "ServiceNow", "Dynatrace", "IT運用", "社会インフラ"],

  /* ---- 連絡先 --------------------------------------------------------- */
  // 公開ページにメールを載せたい場合のみ記入（迷惑メール対策で既定は空）
  email: "",
  // 連絡先カード(.vcf)のダウンロードボタンを出すか
  enableVCard: true,

  /* ---- リンク --------------------------------------------------------- */
  // order 順に表示。url に "REPLACE_ME" が含まれる項目は非表示になります。
  links: [
    {
      id: "hitachi",
      label: "これまでの実績",
      sublabel: "業務実績・取り組みの紹介",
      url: "REPLACE_ME", // 例: "https://www.hitachi.co.jp/..." ※社内公開URLはNG。公開可能なものだけ
      icon: "briefcase",
      accent: "#e0736f",
      featured: true
    },
    {
      id: "github",
      label: "GitHub",
      sublabel: "コード・プロトタイプ",
      url: "https://github.com/eigokono1058-tech",
      icon: "github",
      accent: "#c9d1d9"
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      sublabel: "職歴・つながり",
      url: "REPLACE_ME", // 例: "https://www.linkedin.com/in/your-id/"
      icon: "linkedin",
      accent: "#4a9ae0"
    },
    {
      id: "instagram",
      label: "Instagram",
      sublabel: "日常・イベント記録",
      url: "REPLACE_ME", // 例: "https://www.instagram.com/your_id/"
      icon: "instagram",
      accent: "#e1548a"
    },
    {
      id: "facebook",
      label: "Facebook",
      sublabel: "つながり申請はこちら",
      url: "REPLACE_ME", // 例: "https://www.facebook.com/your.id"
      icon: "facebook",
      accent: "#5b8cff"
    }
  ],

  /* ---- 事業アイデア（イベントで一番見せたいもの） --------------------- */
  project: {
    codename: "LAST METERS",
    title: "AIが発注する時代の「受取」インフラ",
    summary:
      "AIエージェントが発注まで自動化しても、荷物は物理的に届く。その最後の受渡しは今も人間の在宅が前提。ここを機械同士の受渡しに置き換える権限・責任設計のレイヤーをつくる。",
    links: [
      { label: "動くデモを触る", href: "./app/", cta: true, note: "ピンを差して受取先を変える" },
      { label: "構想を読む（ピッチ）", href: "./pitch/", note: "課題・市場・ビジネスモデル" },
      { label: "事業計画ドキュメント", href: "./plan/", note: "論点と検証計画" }
    ]
  },

  /* ---- 公開URL（QR生成のデフォルト値と共有ボタンに使用） -------------- */
  siteUrl: "https://eigokono1058-tech.github.io/-/"
};
