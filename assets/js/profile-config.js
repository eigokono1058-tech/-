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

  /* DevDayの応募文で使った「生成AIエバンジェリスト（公共分野）」に合わせています。
     名刺どおりの表記に戻す場合は下のコメント側と入れ替えてください。
       ja: "ITエンジニア / 営業 · 日立製作所 公共システム営業統括本部",
       en: "IT Engineer / Solution Sales · Public Sector Systems, Hitachi, Ltd." */
  role: {
    ja: "生成AIエバンジェリスト（公共分野）· 日立製作所",
    en: "Generative AI Evangelist, Public Sector · Hitachi, Ltd."
  },

  // 名刺・ポスターの印刷に使う短い肩書き（長いと文字が小さくなるため）
  roleShort: {
    ja: "生成AIエバンジェリスト（公共分野）· 日立製作所",
    en: "Generative AI Evangelist, Public Sector · Hitachi"
  },

  location: { ja: "東京", en: "Tokyo, Japan" },

  // 顔写真（任意）。例: "assets/img/me.jpg" を置いてパスを書く。空ならイニシャル表示
  avatar: "",

  /* 自己紹介1行 = 2つのプロジェクトを貫く1つの主張。
     「難しいのはモデルではなく、エージェントに渡す権限」が共通の論旨。 */
  headline: {
    ja: "最先端AIを、政府機関が安全に使えて監査もできる業務の仕組みに変えています。難しいのはモデルではなく、エージェントに渡す「権限」の設計です。",
    en: "I turn frontier AI into secure, auditable workflows for government. The hard part is never the model — it is the authority you hand an agent."
  },

  // 興味・専門タグ / interests
  tags: {
    ja: ["AIエージェント", "公共・行政", "根拠付き生成", "権限を反映した検索", "評価(Evals)", "物流"],
    en: ["AI Agents", "Public Sector", "Grounded RAG", "Permission-aware retrieval", "Evals", "Logistics"]
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
        ja: "AIナレッジ検索の導入事例（公開記事）",
        en: "AI knowledge retrieval, published case study (Japanese)"
      },
      // DevDayの応募文に載せた記事。deh.hitachi.co.jp/_ct/17805441 と同じ記事です
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

  /* ---- プロジェクト / projects ----------------------------------------
     上から順に表示。1つ目を主役にしています（DevDayの応募軸）。           */
  projects: [
    {
      codename: "GOVERNMENT KNOWLEDGE AGENT",
      badge: { ja: "本業 · 導入実績あり", en: "Day job · deployed" },
      title: {
        ja: "政府機関向け AIナレッジ・エージェント基盤",
        en: "Government Knowledge Agent Platform"
      },
      summary: {
        ja: "行政の仕事は法令・要件書・調達資料・運用知識に支えられているのに、それらは分散していて判断につながらない。権限を反映した検索、ハイブリッド検索、根拠に基づく生成、ツールを使うエージェントを組み合わせ、1つの機関での成功を複数省庁で再利用できるアーキテクチャに育てる。",
        en: "Government work runs on regulations, requirements, procurement materials and operational know-how — all fragmented, none of it decision-ready. Permission-aware retrieval, hybrid search, grounded generation and tool-using agents, built so one agency deployment becomes an architecture other ministries can reuse."
      },
      links: [
        {
          label: { ja: "Launchpad用ブリーフ", en: "Launchpad brief" },
          href: "./launchpad/",
          cta: true,
          note: { ja: "いま聞きたい3つの問い", en: "The 3 questions I'm bringing" }
        },
        {
          label: { ja: "日立の公開事例", en: "Published case study" },
          href: "https://www.hitachi.com/ja-jp/products/digital/highlights/usecases/gyoumu-ai/17805441",
          note: { ja: "日本語記事", en: "in Japanese" }
        }
      ]
    },
    {
      codename: "LAST METERS",
      badge: { ja: "個人プロジェクト · 試作", en: "Side project · prototype" },
      title: {
        ja: "AIが発注する時代の「受取」インフラ",
        en: "Receiving infrastructure for the age of AI agents"
      },
      summary: {
        ja: "同じ問いを物理世界で解いたらどうなるか。AIエージェントが発注まで自動化しても荷物は物理的に届き、その受取は今も人間の在宅が前提。受取権限を最小スコープ・時限付き・失効可能なかたちで発行する層をつくる。",
        en: "The same question in the physical world. Even when AI agents handle ordering end to end, goods still arrive physically — and receiving them still assumes a human is home. A layer that issues the right to receive with least privilege, a time box and revocation."
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
    }
  ],

  /* ---- 公開URL（QR生成のデフォルト値と共有ボタンに使用） -------------- */
  siteUrl: "https://eigokono1058-tech.github.io/-/"
};
