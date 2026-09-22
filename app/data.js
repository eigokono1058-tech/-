/* ==========================================================================
   LAST METERS — デモ用データ定義
   受取地点 / 荷物 / ポリシー / 自律レベル / 例外シナリオ
   ========================================================================== */
window.LM_DATA = (function () {
  /* ---- 自律レベル（どこまでAIに委譲するか） --------------------------- */
  var AUTONOMY = [
    {
      level: 0,
      name: "L0 手動",
      short: "全部人間",
      desc: "受取方法の決定も受渡しも人間が行う。いまの宅配とほぼ同じ状態。",
      allows: [],
      tone: "info"
    },
    {
      level: 1,
      name: "L1 提案のみ",
      short: "AIは提案",
      desc: "AIは最適な受取地点を提案するが、実行には毎回ユーザーの承認が必要。",
      allows: ["suggest"],
      tone: "info"
    },
    {
      level: 2,
      name: "L2 低リスク自動",
      short: "常温・少額は自動",
      desc: "常温かつ低額の荷物だけ、AIが受取地点の決定と受渡しまで自動実行する。",
      allows: ["suggest", "auto_low_risk"],
      tone: "ok"
    },
    {
      level: 3,
      name: "L3 例外時のみ人間",
      short: "推奨",
      desc: "正常系はすべて自律実行。認証失敗・温度逸脱・破損などの例外時だけ人間にエスカレーションする。",
      allows: ["suggest", "auto_low_risk", "auto_all_outdoor", "auto_reroute"],
      tone: "ok",
      recommended: true
    },
    {
      level: 4,
      name: "L4 屋内まで委譲",
      short: "非推奨",
      desc: "玄関の解錠と屋内搬入までロボットに委譲する。物理的な乗っ取り・不法侵入のリスクを人間が肩代わりできないため、本デモでは既定で無効。",
      allows: ["suggest", "auto_low_risk", "auto_all_outdoor", "auto_reroute", "indoor_access"],
      tone: "danger",
      warning:
        "屋内アクセス権をロボットに渡すと、ロボットを制圧・偽装した第三者が住居に侵入できる。自動化の利得より損失が大きいため、このプロジェクトでは「家で受け取らない」設計を採る。"
    }
  ];

  /* ---- 受取地点 --------------------------------------------------------
     caps: その地点が物理的・制度的に提供できる能力
       ambient  常温保管 / chilled 冷蔵 / frozen 冷凍
       identity 本人確認ができる / signature 署名が取れる
       secure   施錠され第三者が触れない / indoor 屋内（住居内）
       attended 人が常駐 / dynamic 位置が動く
  */
  var POINTS = [
    {
      id: "home_door",
      name: "自宅ドア前（置き配）",
      kind: "自宅",
      icon: "home",
      caps: ["ambient"],
      xy: [150, 44],
      labelAbove: true,
      route: [[20, 200], [20, 130], [150, 130], [150, 44]],
      note: "いまの標準。不在でも届くが、盗難・破損・プライバシーの露出が残る。",
      risk: "theft",
      eta_min: 22
    },
    {
      id: "home_locker",
      name: "マンション宅配ロッカー",
      kind: "自宅",
      icon: "locker",
      caps: ["ambient", "secure"],
      xy: [188, 72],
      route: [[20, 200], [20, 130], [150, 130], [150, 72], [188, 72]],
      note: "常温のみ・数が足りない。満杯だと即座に再配達へ戻る。",
      capacity: { used: 7, total: 8 },
      eta_min: 24
    },
    {
      id: "konbini",
      name: "コンビニ受取（24h・冷蔵あり）",
      kind: "地域Hub",
      icon: "store",
      caps: ["ambient", "chilled", "identity", "attended", "secure"],
      xy: [252, 130],
      route: [[20, 200], [20, 130], [252, 130]],
      note: "既存インフラをそのまま地域Hubに使える。冷凍は基本不可。",
      eta_min: 12
    },
    {
      id: "station_locker",
      name: "駅前オープンロッカー",
      kind: "地域Hub",
      icon: "locker",
      caps: ["ambient", "chilled", "frozen", "secure"],
      xy: [318, 62],
      route: [[20, 200], [20, 130], [318, 130], [318, 62]],
      note: "冷凍対応の3温度帯ロッカー。通勤経路上なら受取コストはほぼゼロ。",
      capacity: { used: 3, total: 12 },
      eta_min: 18
    },
    {
      id: "office",
      name: "勤務先の受付",
      kind: "外部",
      icon: "office",
      caps: ["ambient", "attended", "identity", "secure"],
      xy: [58, 44],
      route: [[20, 200], [20, 130], [58, 130], [58, 44]],
      note: "日中いる場所に届ける。社内規程で私物受取が禁止の場合あり。",
      eta_min: 16
    },
    {
      id: "moving_me",
      name: "移動中の自分（GPS）",
      kind: "動的",
      icon: "person",
      caps: ["ambient", "chilled", "frozen", "identity", "signature", "dynamic"],
      xy: null,
      dynamic: true,
      note: "住所ではなく「人」に届ける。帰宅途中のランデブー地点で受け取る。",
      eta_min: 9
    },
    {
      id: "friend",
      name: "友人宅へ委任（暗証番号共有）",
      kind: "委任",
      icon: "delegate",
      caps: ["ambient", "chilled", "attended"],
      xy: [250, 200],
      route: [[20, 200], [250, 200]],
      note: "受取権限を他人に一時委譲する。誰に何を渡したかの記録が必須。",
      eta_min: 14
    },
    {
      id: "indoor",
      name: "屋内まで搬入（ロボット）",
      kind: "屋内",
      icon: "robot",
      caps: ["ambient", "chilled", "frozen", "indoor", "secure"],
      xy: [112, 44],
      labelAbove: true,
      route: [[20, 200], [20, 130], [150, 130], [150, 44], [112, 44]],
      note: "冷蔵庫まで自動搬入。実現には玄関の解錠権限が必要で、リスクが跳ね上がる。",
      risk: "intrusion",
      eta_min: 26
    }
  ];

  /* ---- 荷物（AIエージェントが自動発注したものを含む） ------------------ */
  var PARCELS = [
    {
      id: "ord_0031",
      title: "冷凍ミールキット 7食",
      merchant: "ネットスーパー",
      orderedBy: "agent",
      agentReason: "冷凍庫の在庫が2食を下回ったため自動発注",
      temp: "frozen",
      value: 4280,
      size: "M",
      needs: ["frozen"],
      requiresIdentity: false,
      delegable: true,
      dropAllowed: false,
      icon: "❄️",
      defaultPoint: "home_door",
      slaMin: 45
    },
    {
      id: "ord_0032",
      title: "処方薬（継続処方・1ヶ月分）",
      merchant: "オンライン薬局",
      orderedBy: "agent",
      agentReason: "リモート診察後の定期処方。残薬5日で自動手配",
      temp: "ambient",
      value: 3200,
      size: "S",
      needs: ["identity"],
      requiresIdentity: true,
      delegable: false,
      dropAllowed: false,
      icon: "💊",
      defaultPoint: "home_door",
      slaMin: 120,
      legal: "薬機法上、薬剤師による情報提供と本人（または家族）への交付が必要"
    },
    {
      id: "ord_0033",
      title: "トイレットペーパー 12ロール",
      merchant: "定期便",
      orderedBy: "agent",
      agentReason: "消費ペースから残5日と推定し自動発注",
      temp: "ambient",
      value: 980,
      size: "L",
      needs: [],
      requiresIdentity: false,
      delegable: true,
      dropAllowed: true,
      icon: "🧻",
      defaultPoint: "home_door",
      slaMin: 240
    },
    {
      id: "ord_0034",
      title: "スマートウォッチ",
      merchant: "家電EC",
      orderedBy: "human",
      agentReason: null,
      temp: "ambient",
      value: 68000,
      size: "S",
      needs: ["secure"],
      requiresIdentity: false,
      delegable: false,
      dropAllowed: false,
      icon: "⌚",
      defaultPoint: "home_door",
      slaMin: 180
    }
  ];

  /* ---- ポリシー（受取地点 × 荷物 × 自律レベル の可否判定ルール） -------
     evaluate() が上から順に評価し、deny が1つでも出れば拒否。
     conditional は条件付き許可（追加の認証・時間制約が付く）。
  */
  var RULES = [
    {
      id: "temp_chain",
      title: "温度帯の適合",
      test: function (p, pt) {
        var need = p.temp;
        if (need === "ambient") return null;
        if (pt.caps.indexOf(need) === -1) {
          return {
            verdict: "deny",
            reason:
              (need === "frozen" ? "冷凍" : "冷蔵") +
              "品を保持できない受取地点です（温度帯の破綻は食品衛生上リコール対象）"
          };
        }
        return null;
      }
    },
    {
      id: "identity",
      title: "本人確認の要否",
      test: function (p, pt) {
        if (!p.requiresIdentity) return null;
        if (pt.caps.indexOf("identity") === -1) {
          return { verdict: "deny", reason: "本人確認ができない地点では交付できません" };
        }
        return { verdict: "conditional", reason: "受取時に本人確認（顔認証または身分証）を必須化します", adds: ["identity_check"] };
      }
    },
    {
      id: "delegation",
      title: "第三者委任の可否",
      test: function (p, pt) {
        if (pt.id !== "friend") return null;
        if (!p.delegable) {
          return {
            verdict: "deny",
            reason: p.legal ? "第三者委任が制度上できません（" + p.legal + "）" : "この荷物は第三者への委任が許可されていません"
          };
        }
        return {
          verdict: "conditional",
          reason: "被委任者を記録し、30分間有効のワンタイム暗証番号のみを共有します",
          adds: ["delegate_record", "one_time_code"]
        };
      }
    },
    {
      id: "high_value",
      title: "高額品の扱い",
      test: function (p, pt) {
        if (p.value < 50000) return null;
        // 施錠されている / 人が常駐している / 本人確認ができる のいずれかが必要
        var guarded = ["secure", "attended", "identity"].some(function (c) {
          return pt.caps.indexOf(c) !== -1;
        });
        if (!guarded) {
          return { verdict: "deny", reason: "5万円以上の荷物を無施錠・無人の場所に置くことは保険条件を満たしません" };
        }
        return { verdict: "conditional", reason: "高額品：受渡し時の署名または本人認証と、写真証跡を必須化します", adds: ["signature", "photo_evidence"] };
      }
    },
    {
      id: "drop_off",
      title: "置き配の可否",
      test: function (p, pt) {
        if (pt.id !== "home_door") return null;
        if (!p.dropAllowed) {
          return {
            verdict: "deny",
            reason: p.temp !== "ambient"
              ? "置き配では温度帯を保てません"
              : "この荷物は置き配が許可されていません（盗難・本人確認の要件）"
          };
        }
        return { verdict: "conditional", reason: "置き配：写真証跡を残し、盗難時の補償対象としてマークします", adds: ["photo_evidence"] };
      }
    },
    {
      id: "capacity",
      title: "受入容量",
      test: function (p, pt) {
        if (!pt.capacity) return null;
        if (pt.capacity.used >= pt.capacity.total) {
          return { verdict: "deny", reason: "空きボックスがありません（" + pt.capacity.used + "/" + pt.capacity.total + "）" };
        }
        if (pt.capacity.total - pt.capacity.used <= 1) {
          return { verdict: "conditional", reason: "残り1枠。到着時に埋まっていれば自動で代替Hubへ再ルートします", adds: ["auto_reroute"] };
        }
        return null;
      }
    },
    {
      id: "indoor_access",
      title: "屋内アクセス権",
      test: function (p, pt, ctx) {
        if (pt.caps.indexOf("indoor") === -1) return null;
        if (ctx.autonomy < 4) {
          return {
            verdict: "deny",
            reason: "屋内への立ち入り権限は自律レベルL4のみ。L4は乗っ取りリスクが人間側で吸収できないため既定で無効です"
          };
        }
        return {
          verdict: "conditional",
          reason: "屋内アクセス：5分間のみ・玄関〜冷蔵庫の経路のみに限定し、全行程を録画します",
          adds: ["geofence_indoor", "video_evidence", "time_boxed_5min"]
        };
      }
    },
    {
      id: "dynamic_rendezvous",
      title: "動的ランデブー",
      test: function (p, pt, ctx) {
        if (!pt.dynamic) return null;
        if (ctx.autonomy < 2) {
          return { verdict: "conditional", reason: "位置共有による受取はユーザーの都度承認が必要です（L2以上で自動化）", adds: ["user_approval"] };
        }
        if (p.temp !== "ambient") {
          return {
            verdict: "conditional",
            reason: "GPS共有：位置は受取直前の10分間のみ開示。" +
              (p.temp === "frozen" ? "冷凍" : "冷蔵") + "品は保冷バッグで手渡し、受取後30分以内の持ち帰りが前提です",
            adds: ["ephemeral_location", "one_time_code", "cold_bag_handover"]
          };
        }
        return {
          verdict: "conditional",
          reason: "GPS共有：受取直前の10分間のみ位置を配送側に開示し、受取完了で即失効します",
          adds: ["ephemeral_location", "one_time_code"]
        };
      }
    }
  ];

  /* ---- 例外シナリオ ---------------------------------------------------- */
  var EXCEPTIONS = [
    {
      id: "locker_full",
      label: "ロッカーが満杯",
      severity: "medium",
      auto: "auto_reroute",
      autoAction: "空きのある隣接Hubへ再ルートし、旧グラントを失効して新グラントを再発行",
      humanAction: "ユーザーに代替地点の候補を提示して選択を仰ぐ",
      teaches: "自動化の価値は正常系ではなく、この再手配の速さで決まる"
    },
    {
      id: "auth_fail",
      label: "受取認証に失敗（3回）",
      severity: "high",
      auto: null,
      autoAction: null,
      humanAction: "受渡しを中断し、荷物を施錠状態で保持したままユーザーへ通知。再認証か持ち戻りを選択",
      teaches: "認証失敗をリトライで突破させない。ここは必ず人間に返す"
    },
    {
      id: "cold_fail",
      label: "冷凍設備が故障（-8℃まで上昇）",
      severity: "high",
      auto: null,
      autoAction: null,
      humanAction: "温度逸脱を記録し配送を中断。返送・返金フローへ。責任は設備運営者側",
      teaches: "温度は「証跡」。誰の管理区間で逸脱したかが責任分界そのものになる"
    },
    {
      id: "comms_loss",
      label: "通信障害（ロボットが応答しない）",
      severity: "medium",
      auto: "fail_safe",
      autoAction: "グラントの有効期限切れで権限が自動失効（fail-safe）。ロボットは現地待機",
      humanAction: "運行管理者が現地対応を手配",
      teaches: "権限は「時間で切れる」ものとして設計する。通信が切れたら開かないのが正しい"
    },
    {
      id: "robot_attack",
      label: "配送ロボットが襲われた",
      severity: "critical",
      auto: "lockdown",
      autoAction: "全庫室を施錠維持しグラントを即時失効。位置発信と通報、証跡を保全",
      humanAction: "運行停止・警察通報・荷主へ通知",
      teaches: "ロボットを制圧しても中身と住居権限が取れない構造にする。だから屋内アクセスは渡さない"
    },
    {
      id: "long_absence",
      label: "受取人が長期不在（7日）",
      severity: "low",
      auto: "auto_reroute",
      autoAction: "保管期限前に冷蔵Hubへ移送、または委任先へ自動切替を提案",
      humanAction: "保管延長か返品かをユーザーが決定",
      teaches: "例外の大半は「時間切れ」。期限の設計が運用コストを決める"
    }
  ];

  /* ---- 責任分界（chain of custody の各区間） --------------------------- */
  var CUSTODY_CHAIN = [
    { id: "order", label: "発注", holder: "利用者 / 委任されたAIエージェント", risk: "誤発注・過剰発注" },
    { id: "fulfill", label: "出荷", holder: "EC・小売事業者", risk: "誤品・欠品・破損" },
    { id: "transport", label: "輸送", holder: "配送事業者（ロボット運行者）", risk: "遅延・破損・事故" },
    { id: "handover", label: "受渡し", holder: "受取地点の運営者", risk: "盗難・認証失敗・温度逸脱" },
    { id: "store", label: "保管", holder: "利用者", risk: "受取後の紛失・品質劣化" }
  ];

  return {
    AUTONOMY: AUTONOMY,
    POINTS: POINTS,
    PARCELS: PARCELS,
    RULES: RULES,
    EXCEPTIONS: EXCEPTIONS,
    CUSTODY_CHAIN: CUSTODY_CHAIN,
    pointById: function (id) {
      for (var i = 0; i < POINTS.length; i++) if (POINTS[i].id === id) return POINTS[i];
      return null;
    },
    parcelById: function (id) {
      for (var i = 0; i < PARCELS.length; i++) if (PARCELS[i].id === id) return PARCELS[i];
      return null;
    }
  };
})();
