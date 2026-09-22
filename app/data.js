/* ==========================================================================
   LAST METERS — デモ用データ定義 / demo data (bilingual ja + en)
   受取地点 / 荷物 / ポリシー / 自律レベル / 例外シナリオ
   表示文字列はすべて {ja, en} で持つ。LM_I18N.t() で取り出す。
   ========================================================================== */
window.LM_DATA = (function () {
  /* ---- 自律レベル / autonomy levels ----------------------------------- */
  var AUTONOMY = [
    {
      level: 0,
      badge: { ja: "L0 手動", en: "L0 · manual" },
      name: { ja: "L0 手動", en: "L0 Manual" },
      short: { ja: "全部人間", en: "Humans do everything" },
      desc: {
        ja: "受取方法の決定も受渡しも人間が行う。いまの宅配とほぼ同じ状態。",
        en: "A human chooses the destination and takes the handoff. Roughly how delivery works today."
      },
      tone: "info"
    },
    {
      level: 1,
      badge: { ja: "L1 提案のみ", en: "L1 · suggest" },
      name: { ja: "L1 提案のみ", en: "L1 Suggest only" },
      short: { ja: "AIは提案", en: "AI suggests" },
      desc: {
        ja: "AIは最適な受取地点を提案するが、実行には毎回ユーザーの承認が必要。",
        en: "The AI proposes the best pickup point, but every action needs your approval."
      },
      tone: "info"
    },
    {
      level: 2,
      badge: { ja: "L2 低リスク自動", en: "L2 · low risk" },
      name: { ja: "L2 低リスク自動", en: "L2 Low risk automated" },
      short: { ja: "常温・少額は自動", en: "Ambient & low value" },
      desc: {
        ja: "常温かつ低額の荷物だけ、AIが受取地点の決定と受渡しまで自動実行する。",
        en: "Only ambient, low-value parcels are routed and handed over automatically."
      },
      tone: "ok"
    },
    {
      level: 3,
      badge: { ja: "L3 例外時のみ人間", en: "L3 · exceptions" },
      name: { ja: "L3 例外時のみ人間", en: "L3 Humans on exceptions" },
      short: { ja: "推奨", en: "Recommended" },
      desc: {
        ja: "正常系はすべて自律実行。認証失敗・温度逸脱・破損などの例外時だけ人間にエスカレーションする。",
        en: "The happy path runs autonomously; only exceptions — failed auth, temperature breach, damage — escalate to a human."
      },
      tone: "ok",
      recommended: true
    },
    {
      level: 4,
      badge: { ja: "L4 屋内まで委譲", en: "L4 · indoor" },
      name: { ja: "L4 屋内まで委譲", en: "L4 Indoor access delegated" },
      short: { ja: "非推奨", en: "Not recommended" },
      desc: {
        ja: "玄関の解錠と屋内搬入までロボットに委譲する。物理的な乗っ取り・不法侵入のリスクを人間が肩代わりできないため、本デモでは既定で無効。",
        en: "Unlocking the front door and carrying goods inside is delegated to a robot. Disabled by default here, because no human can absorb the hijacking and trespass risk."
      },
      tone: "danger",
      warning: {
        ja: "屋内アクセス権をロボットに渡すと、ロボットを制圧・偽装した第三者が住居に侵入できる。自動化の利得より損失が大きいため、このプロジェクトでは「家で受け取らない」設計を採る。",
        en: "Hand a robot the keys to your home and anyone who overpowers or spoofs that robot walks in. The loss outweighs the gain, so this project bets on never needing to receive at home."
      }
    }
  ];

  /* ---- 受取地点 / pickup points ---------------------------------------
     caps: その地点が物理的・制度的に提供できる能力
       ambient / chilled / frozen  温度帯
       identity 本人確認可 / signature 署名可
       secure 施錠 / indoor 屋内 / attended 有人 / dynamic 位置が動く       */
  var POINTS = [
    {
      id: "home_door",
      name: { ja: "自宅ドア前（置き配）", en: "My front door (leave it)" },
      kind: { ja: "自宅", en: "Home" },
      icon: "home",
      caps: ["ambient"],
      xy: [150, 44],
      labelAbove: true,
      label: { ja: "自宅ドア前", en: "Front door" },
      route: [[20, 200], [20, 130], [150, 130], [150, 44]],
      note: {
        ja: "いまの標準。不在でも届くが、盗難・破損・プライバシーの露出が残る。",
        en: "Today's default. Works when you are out, but theft, damage and exposure remain."
      },
      risk: "theft",
      eta_min: 22
    },
    {
      id: "home_locker",
      name: { ja: "マンション宅配ロッカー", en: "Building parcel locker" },
      kind: { ja: "自宅", en: "Home" },
      icon: "locker",
      caps: ["ambient", "secure"],
      xy: [188, 72],
      label: { ja: "宅配ロッカー", en: "Building locker" },
      route: [[20, 200], [20, 130], [150, 130], [150, 72], [188, 72]],
      note: {
        ja: "常温のみ・数が足りない。満杯だと即座に再配達へ戻る。",
        en: "Ambient only, and never enough boxes. Once full, you are back to redelivery."
      },
      capacity: { used: 7, total: 8 },
      eta_min: 24
    },
    {
      id: "konbini",
      name: { ja: "コンビニ受取（24h・冷蔵あり）", en: "Convenience store (24h, chilled)" },
      kind: { ja: "地域Hub", en: "Local hub" },
      icon: "store",
      caps: ["ambient", "chilled", "identity", "attended", "secure"],
      xy: [252, 130],
      label: { ja: "コンビニ", en: "Konbini" },
      route: [[20, 200], [20, 130], [252, 130]],
      note: {
        ja: "既存インフラをそのまま地域Hubに使える。冷凍は基本不可。",
        en: "Existing infrastructure works as a local hub as-is. Frozen usually not possible."
      },
      eta_min: 12
    },
    {
      id: "station_locker",
      name: { ja: "駅前オープンロッカー", en: "Open locker at the station" },
      kind: { ja: "地域Hub", en: "Local hub" },
      icon: "locker",
      caps: ["ambient", "chilled", "frozen", "secure"],
      xy: [318, 62],
      label: { ja: "駅ロッカー", en: "Station locker" },
      route: [[20, 200], [20, 130], [318, 130], [318, 62]],
      note: {
        ja: "冷凍対応の3温度帯ロッカー。通勤経路上なら受取コストはほぼゼロ。",
        en: "Three temperature zones including frozen. On your commute, pickup costs you nothing."
      },
      capacity: { used: 3, total: 12 },
      eta_min: 18
    },
    {
      id: "office",
      name: { ja: "勤務先の受付", en: "My office reception" },
      kind: { ja: "外部", en: "Third party" },
      icon: "office",
      caps: ["ambient", "attended", "identity", "secure"],
      xy: [58, 44],
      labelAbove: true,
      label: { ja: "勤務先", en: "Office" },
      route: [[20, 200], [20, 130], [58, 130], [58, 44]],
      note: {
        ja: "日中いる場所に届ける。社内規程で私物受取が禁止の場合あり。",
        en: "Deliver where you actually are in the daytime. Some employers forbid personal parcels."
      },
      eta_min: 16
    },
    {
      id: "moving_me",
      name: { ja: "移動中の自分（GPS）", en: "Me, in transit (GPS)" },
      kind: { ja: "動的", en: "Dynamic" },
      icon: "person",
      caps: ["ambient", "chilled", "frozen", "identity", "signature", "dynamic"],
      xy: null,
      dynamic: true,
      label: { ja: "自分", en: "Me" },
      note: {
        ja: "住所ではなく「人」に届ける。帰宅途中のランデブー地点で受け取る。",
        en: "Deliver to a person, not an address. Meet the vehicle at a rendezvous point on your way home."
      },
      eta_min: 9
    },
    {
      id: "friend",
      name: { ja: "友人宅へ委任（暗証番号共有）", en: "Delegate to a friend (shared code)" },
      kind: { ja: "委任", en: "Delegated" },
      icon: "delegate",
      caps: ["ambient", "chilled", "attended"],
      xy: [250, 200],
      label: { ja: "友人宅", en: "Friend" },
      route: [[20, 200], [250, 200]],
      note: {
        ja: "受取権限を他人に一時委譲する。誰に何を渡したかの記録が必須。",
        en: "Temporarily delegate the right to receive. Requires a record of who got what."
      },
      eta_min: 14
    },
    {
      id: "indoor",
      name: { ja: "屋内まで搬入（ロボット）", en: "Carried indoors by a robot" },
      kind: { ja: "屋内", en: "Indoor" },
      icon: "robot",
      caps: ["ambient", "chilled", "frozen", "indoor", "secure"],
      xy: [112, 44],
      labelAbove: true,
      label: { ja: "屋内搬入", en: "Indoors" },
      route: [[20, 200], [20, 130], [150, 130], [150, 44], [112, 44]],
      note: {
        ja: "冷蔵庫まで自動搬入。実現には玄関の解錠権限が必要で、リスクが跳ね上がる。",
        en: "All the way to the fridge. Needs the right to unlock your door, which changes the risk entirely."
      },
      risk: "intrusion",
      eta_min: 26
    }
  ];

  /* ---- 荷物 / parcels -------------------------------------------------- */
  var PARCELS = [
    {
      id: "ord_0031",
      title: { ja: "冷凍ミールキット 7食", en: "Frozen meal kits ×7" },
      merchant: { ja: "ネットスーパー", en: "Online supermarket" },
      orderedBy: "agent",
      agentReason: {
        ja: "冷凍庫の在庫が2食を下回ったため自動発注",
        en: "Freezer stock dropped below two meals, so the agent reordered"
      },
      temp: "frozen",
      value: 4280,
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
      title: { ja: "処方薬（継続処方・1ヶ月分）", en: "Prescription medicine (1 month)" },
      merchant: { ja: "オンライン薬局", en: "Online pharmacy" },
      orderedBy: "agent",
      agentReason: {
        ja: "リモート診察後の定期処方。残薬5日で自動手配",
        en: "Repeat prescription after a remote consult, triggered at five days of stock left"
      },
      temp: "ambient",
      value: 3200,
      needs: ["identity"],
      requiresIdentity: true,
      delegable: false,
      dropAllowed: false,
      icon: "💊",
      defaultPoint: "home_door",
      slaMin: 120,
      legal: {
        ja: "薬機法上、薬剤師による情報提供と本人（または家族）への交付が必要",
        en: "Japanese pharmaceutical law requires a pharmacist's guidance and handover to the patient or family"
      }
    },
    {
      id: "ord_0033",
      title: { ja: "トイレットペーパー 12ロール", en: "Toilet paper ×12" },
      merchant: { ja: "定期便", en: "Subscription" },
      orderedBy: "agent",
      agentReason: {
        ja: "消費ペースから残5日と推定し自動発注",
        en: "Consumption rate implied five days left, so the agent reordered"
      },
      temp: "ambient",
      value: 980,
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
      title: { ja: "スマートウォッチ", en: "Smartwatch" },
      merchant: { ja: "家電EC", en: "Electronics retailer" },
      orderedBy: "human",
      agentReason: null,
      temp: "ambient",
      value: 68000,
      needs: ["secure"],
      requiresIdentity: false,
      delegable: false,
      dropAllowed: false,
      icon: "⌚",
      defaultPoint: "home_door",
      slaMin: 180
    }
  ];

  /* ---- ポリシールール / policy rules ---------------------------------- */
  var RULES = [
    {
      id: "temp_chain",
      title: { ja: "温度帯の適合", en: "Temperature chain" },
      test: function (p, pt) {
        var need = p.temp;
        if (need === "ambient") return null;
        if (pt.caps.indexOf(need) === -1) {
          return {
            verdict: "deny",
            reason: {
              ja: (need === "frozen" ? "冷凍" : "冷蔵") +
                "品を保持できない受取地点です（温度帯の破綻は食品衛生上リコール対象）",
              en: "This point cannot hold " + (need === "frozen" ? "frozen" : "chilled") +
                " goods — a broken cold chain means the food has to be written off"
            }
          };
        }
        return null;
      }
    },
    {
      id: "identity",
      title: { ja: "本人確認の要否", en: "Identity check" },
      test: function (p, pt) {
        if (!p.requiresIdentity) return null;
        if (pt.caps.indexOf("identity") === -1) {
          return {
            verdict: "deny",
            reason: {
              ja: "本人確認ができない地点では交付できません",
              en: "Cannot be handed over where identity cannot be verified"
            }
          };
        }
        return {
          verdict: "conditional",
          reason: {
            ja: "受取時に本人確認（顔認証または身分証）を必須化します",
            en: "Requires identity verification at pickup (face match or ID)"
          },
          adds: ["identity_check"]
        };
      }
    },
    {
      id: "delegation",
      title: { ja: "第三者委任の可否", en: "Delegation to a third party" },
      test: function (p, pt) {
        if (pt.id !== "friend") return null;
        if (!p.delegable) {
          return {
            verdict: "deny",
            reason: p.legal
              ? {
                ja: "第三者委任が制度上できません（" + p.legal.ja + "）",
                en: "Delegation is not legally possible (" + p.legal.en + ")"
              }
              : {
                ja: "この荷物は第三者への委任が許可されていません",
                en: "This parcel may not be delegated to a third party"
              }
          };
        }
        return {
          verdict: "conditional",
          reason: {
            ja: "被委任者を記録し、30分間有効のワンタイム暗証番号のみを共有します",
            en: "Records who received it and shares only a one-time code valid for 30 minutes"
          },
          adds: ["delegate_record", "one_time_code"]
        };
      }
    },
    {
      id: "high_value",
      title: { ja: "高額品の扱い", en: "High value goods" },
      test: function (p, pt) {
        if (p.value < 50000) return null;
        // 施錠されている / 人が常駐している / 本人確認ができる のいずれかが必要
        var guarded = ["secure", "attended", "identity"].some(function (c) {
          return pt.caps.indexOf(c) !== -1;
        });
        if (!guarded) {
          return {
            verdict: "deny",
            reason: {
              ja: "5万円以上の荷物を無施錠・無人の場所に置くことは保険条件を満たしません",
              en: "Leaving goods over ¥50,000 unlocked and unattended breaks the insurance terms"
            }
          };
        }
        return {
          verdict: "conditional",
          reason: {
            ja: "高額品：受渡し時の署名または本人認証と、写真証跡を必須化します",
            en: "High value: requires a signature or identity check plus photo evidence"
          },
          adds: ["signature", "photo_evidence"]
        };
      }
    },
    {
      id: "drop_off",
      title: { ja: "置き配の可否", en: "Leaving it at the door" },
      test: function (p, pt) {
        if (pt.id !== "home_door") return null;
        if (!p.dropAllowed) {
          return {
            verdict: "deny",
            reason: p.temp !== "ambient"
              ? {
                ja: "置き配では温度帯を保てません",
                en: "Leaving it at the door cannot hold the temperature"
              }
              : {
                ja: "この荷物は置き配が許可されていません（盗難・本人確認の要件）",
                en: "This parcel cannot be left unattended (theft and identity requirements)"
              }
          };
        }
        return {
          verdict: "conditional",
          reason: {
            ja: "置き配：写真証跡を残し、盗難時の補償対象としてマークします",
            en: "Leave at door: stores photo evidence and flags it for theft coverage"
          },
          adds: ["photo_evidence"]
        };
      }
    },
    {
      id: "capacity",
      title: { ja: "受入容量", en: "Capacity" },
      test: function (p, pt) {
        if (!pt.capacity) return null;
        if (pt.capacity.used >= pt.capacity.total) {
          return {
            verdict: "deny",
            reason: {
              ja: "空きボックスがありません（" + pt.capacity.used + "/" + pt.capacity.total + "）",
              en: "No free boxes (" + pt.capacity.used + "/" + pt.capacity.total + ")"
            }
          };
        }
        if (pt.capacity.total - pt.capacity.used <= 1) {
          return {
            verdict: "conditional",
            reason: {
              ja: "残り1枠。到着時に埋まっていれば自動で代替Hubへ再ルートします",
              en: "One slot left. If it fills before arrival, it reroutes to another hub automatically"
            },
            adds: ["auto_reroute"]
          };
        }
        return null;
      }
    },
    {
      id: "indoor_access",
      title: { ja: "屋内アクセス権", en: "Indoor access" },
      test: function (p, pt, ctx) {
        if (pt.caps.indexOf("indoor") === -1) return null;
        if (ctx.autonomy < 4) {
          return {
            verdict: "deny",
            reason: {
              ja: "屋内への立ち入り権限は自律レベルL4のみ。L4は乗っ取りリスクが人間側で吸収できないため既定で無効です",
              en: "Entering the home is L4 only, and L4 is disabled by default because the hijacking risk cannot be absorbed by a human"
            }
          };
        }
        return {
          verdict: "conditional",
          reason: {
            ja: "屋内アクセス：5分間のみ・玄関〜冷蔵庫の経路のみに限定し、全行程を録画します",
            en: "Indoor access: five minutes only, limited to the door-to-fridge path, fully recorded"
          },
          adds: ["geofence_indoor", "video_evidence", "time_boxed_5min"]
        };
      }
    },
    {
      id: "dynamic_rendezvous",
      title: { ja: "動的ランデブー", en: "Dynamic rendezvous" },
      test: function (p, pt, ctx) {
        if (!pt.dynamic) return null;
        if (ctx.autonomy < 2) {
          return {
            verdict: "conditional",
            reason: {
              ja: "位置共有による受取はユーザーの都度承認が必要です（L2以上で自動化）",
              en: "Location-based pickup needs your approval each time (automated from L2 up)"
            },
            adds: ["user_approval"]
          };
        }
        if (p.temp !== "ambient") {
          return {
            verdict: "conditional",
            reason: {
              ja: "GPS共有：位置は受取直前の10分間のみ開示。" +
                (p.temp === "frozen" ? "冷凍" : "冷蔵") + "品は保冷バッグで手渡し、受取後30分以内の持ち帰りが前提です",
              en: "GPS: your location is exposed for ten minutes before pickup only. " +
                (p.temp === "frozen" ? "Frozen" : "Chilled") + " goods are handed over in a cool bag and must be home within 30 minutes"
            },
            adds: ["ephemeral_location", "one_time_code", "cold_bag_handover"]
          };
        }
        return {
          verdict: "conditional",
          reason: {
            ja: "GPS共有：受取直前の10分間のみ位置を配送側に開示し、受取完了で即失効します",
            en: "GPS: location is shared with the carrier for ten minutes before pickup and revoked on handover"
          },
          adds: ["ephemeral_location", "one_time_code"]
        };
      }
    }
  ];

  /* ---- 例外シナリオ / exception scenarios ------------------------------ */
  var EXCEPTIONS = [
    {
      id: "locker_full",
      label: { ja: "ロッカーが満杯", en: "Locker is full" },
      severity: "medium",
      auto: "auto_reroute",
      autoAction: {
        ja: "空きのある隣接Hubへ再ルートし、旧グラントを失効して新グラントを再発行",
        en: "Reroutes to a nearby hub with space, revokes the old grant and issues a new one"
      },
      humanAction: {
        ja: "ユーザーに代替地点の候補を提示して選択を仰ぐ",
        en: "Offers alternative points and asks the user to choose"
      },
      teaches: {
        ja: "自動化の価値は正常系ではなく、この再手配の速さで決まる",
        en: "Automation earns its keep in how fast it re-plans, not in the happy path"
      }
    },
    {
      id: "auth_fail",
      label: { ja: "受取認証に失敗（3回）", en: "Pickup auth failed (3×)" },
      severity: "high",
      auto: null,
      autoAction: null,
      humanAction: {
        ja: "受渡しを中断し、荷物を施錠状態で保持したままユーザーへ通知。再認証か持ち戻りを選択",
        en: "Stops the handover, keeps the parcel locked and notifies the user to retry or return it"
      },
      teaches: {
        ja: "認証失敗をリトライで突破させない。ここは必ず人間に返す",
        en: "Never let retries defeat authentication. This one always goes back to a human"
      }
    },
    {
      id: "cold_fail",
      label: { ja: "冷凍設備が故障（-8℃まで上昇）", en: "Freezer failure (rose to -8°C)" },
      severity: "high",
      auto: null,
      autoAction: null,
      humanAction: {
        ja: "温度逸脱を記録し配送を中断。返送・返金フローへ。責任は設備運営者側",
        en: "Logs the breach and stops delivery, moving to return and refund. Liability sits with the site operator"
      },
      teaches: {
        ja: "温度は「証跡」。誰の管理区間で逸脱したかが責任分界そのものになる",
        en: "Temperature is evidence: whose custody the breach happened in *is* the liability boundary"
      }
    },
    {
      id: "comms_loss",
      label: { ja: "通信障害（ロボットが応答しない）", en: "Comms loss (robot unreachable)" },
      severity: "medium",
      auto: "fail_safe",
      autoAction: {
        ja: "グラントの有効期限切れで権限が自動失効（fail-safe）。ロボットは現地待機",
        en: "The grant expires, so the permission dies on its own (fail-safe). The robot holds position"
      },
      humanAction: {
        ja: "運行管理者が現地対応を手配",
        en: "The fleet operator dispatches someone on site"
      },
      teaches: {
        ja: "権限は「時間で切れる」ものとして設計する。通信が切れたら開かないのが正しい",
        en: "Design permissions to expire. When the network dies, not opening is the correct behaviour"
      }
    },
    {
      id: "robot_attack",
      label: { ja: "配送ロボットが襲われた", en: "The delivery robot was attacked" },
      severity: "critical",
      auto: "lockdown",
      autoAction: {
        ja: "全庫室を施錠維持しグラントを即時失効。位置発信と通報、証跡を保全",
        en: "Keeps every compartment locked, revokes the grant instantly, keeps broadcasting location and preserves evidence"
      },
      humanAction: {
        ja: "運行停止・警察通報・荷主へ通知",
        en: "Halt operations, call the police, notify the shipper"
      },
      teaches: {
        ja: "ロボットを制圧しても中身と住居権限が取れない構造にする。だから屋内アクセスは渡さない",
        en: "Overpowering the robot must not yield the contents or the keys to a home. That is why indoor access is never granted"
      }
    },
    {
      id: "long_absence",
      label: { ja: "受取人が長期不在（7日）", en: "Recipient away for 7 days" },
      severity: "low",
      auto: "auto_reroute",
      autoAction: {
        ja: "保管期限前に冷蔵Hubへ移送、または委任先へ自動切替を提案",
        en: "Moves it to a chilled hub before the deadline, or proposes switching to a delegate"
      },
      humanAction: {
        ja: "保管延長か返品かをユーザーが決定",
        en: "The user decides between extending storage and returning it"
      },
      teaches: {
        ja: "例外の大半は「時間切れ」。期限の設計が運用コストを決める",
        en: "Most exceptions are just deadlines expiring. Deadline design drives operating cost"
      }
    }
  ];

  /* ---- 責任分界 / chain of custody ------------------------------------- */
  var CUSTODY_CHAIN = [
    {
      id: "order",
      label: { ja: "発注", en: "Order" },
      holder: { ja: "利用者 / 委任されたAIエージェント", en: "User / delegated AI agent" },
      holderShort: { ja: "利用者", en: "User" },
      risk: { ja: "誤発注・過剰発注", en: "Wrong or excess orders" }
    },
    {
      id: "fulfill",
      label: { ja: "出荷", en: "Fulfilment" },
      holder: { ja: "EC・小売事業者", en: "Retailer" },
      holderShort: { ja: "EC・小売", en: "Retailer" },
      risk: { ja: "誤品・欠品・破損", en: "Wrong item, missing item, damage" }
    },
    {
      id: "transport",
      label: { ja: "輸送", en: "Transport" },
      holder: { ja: "配送事業者（ロボット運行者）", en: "Carrier / robot operator" },
      holderShort: { ja: "配送事業者", en: "Carrier" },
      risk: { ja: "遅延・破損・事故", en: "Delay, damage, accidents" }
    },
    {
      id: "handover",
      label: { ja: "受渡し", en: "Handover" },
      holder: { ja: "受取地点の運営者", en: "Pickup point operator" },
      holderShort: { ja: "受取地点", en: "Pickup site" },
      risk: { ja: "盗難・認証失敗・温度逸脱", en: "Theft, failed auth, temperature breach" }
    },
    {
      id: "store",
      label: { ja: "保管", en: "Storage" },
      holder: { ja: "利用者", en: "User" },
      holderShort: { ja: "利用者", en: "User" },
      risk: { ja: "受取後の紛失・品質劣化", en: "Loss or spoilage after pickup" }
    }
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
