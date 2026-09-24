/* ==========================================================================
   DELIVERY OS — サンフランシスコの地形 / San Francisco geography

   デモの舞台は実在の街（SoMa・金融街・エンバカデロ）。
   外部の地図タイルもAPIキーも使わず、緯度経度から自分で描く。
   会場のWi-Fiが死んでも地図が出る、というのがこの作りの理由。

   街の形は2つの格子でできている。市内の地図を見て誰もが気づく特徴：
     ・マーケット通りが北東へ45°に走る
     ・その北西側（金融街）は、ほぼ南北の格子（真北から約8.5°西に傾く）
     ・その南東側（SoMa）は、マーケット通りに平行・直交する格子
   この3つを再現すると、SF以外には見えない形になる。

   座標系: 原点 = マーケット通り × モンゴメリー通り（モンゴメリー駅の上）
           x は東が正、y は南が正、SVG 1単位 = 4m
   通りの位置は実測ではなく、実在の交差点を基準にした間隔から作っている。
   （番地レベルの正確さではなく、街の形が正しく見えることを狙っている）
   ========================================================================== */
window.LM_SF = (function () {
  var ANCHOR = { lat: 37.7894, lon: -122.4017 };  // マーケット通り × モンゴメリー通り
  var DEG_M = 111320;                              // 緯度1度 ≒ 111.32km
  var UNIT_M = 4;                                  // SVG 1単位 = 4m
  var RAD = Math.PI / 180;
  var KX = Math.cos(ANCHOR.lat * RAD);             // 経度1度の東西距離の補正

  /** 緯度経度 → 地図の座標（単位） */
  function ll(lat, lon) {
    return [(lon - ANCHOR.lon) * KX * DEG_M / UNIT_M, -(lat - ANCHOR.lat) * DEG_M / UNIT_M];
  }
  function u(m) { return m / UNIT_M; }

  /** 方位角（北=0、東回り）→ 単位ベクトル */
  function dir(bearing) { return [Math.sin(bearing * RAD), -Math.cos(bearing * RAD)]; }

  var MARKET = dir(45);      // マーケット通りに沿う向き（北東）
  var CROSS = dir(135);      // マーケット通りに直交（南東＝SoMa側）
  var NS = dir(-8.5);        // 金融街の南北の通り（北向き）
  var EW = dir(81.5);        // 金融街の東西の通り（東向き）

  /** マーケット格子：通り沿いにalong[m]、直交方向にcross[m]（南東が正） */
  function grid(along, cross) {
    return [u(MARKET[0] * along + CROSS[0] * cross), u(MARKET[1] * along + CROSS[1] * cross)];
  }
  /** 金融街格子：東へeast[m]、北へnorth[m] */
  function fidi(east, north) {
    return [u(EW[0] * east + NS[0] * north), u(EW[1] * east + NS[1] * north)];
  }

  /* ---- 描く範囲。画面の形に合わせて切り出すので、余裕を持って広く描く ---- */
  var EXTENT = { x0: u(-2600), x1: u(2400), y0: u(-2600), y1: u(2400) };

  /* ---- いつも画面に入っていてほしい範囲 ----------------------------------
     デモに出てくる場所（SoMaの自宅・モンゴメリー駅・勤務先）に加えて、
     湾とフェリービルディングまで入れる。これが無いとサンフランシスコに見えない。 */
  var FOCUS = { x: u(-260), y: u(-820), w: u(1060), h: u(1580) };

  /* ======================================================================
     通り
     ====================================================================== */

  /* マーケット通りの南東側（SoMa）。数字の通りは直交、名前の通りは平行。 */
  var SOMA_CROSS = [   // マーケット通り沿いの位置[m]（北東が正）
    { at: 1000, name: { ja: "スチュワート通り", en: "Steuart St" }, w: "minor" },
    { at: 887, name: { ja: "スピア通り", en: "Spear St" }, w: "minor" },
    { at: 757, name: { ja: "メイン通り", en: "Main St" }, w: "minor" },
    { at: 627, name: { ja: "ビール通り", en: "Beale St" }, w: "minor" },
    { at: 497, name: { ja: "フリーモント通り", en: "Fremont St" }, w: "arterial" },
    { at: 367, name: { ja: "ファースト通り", en: "1st St" }, w: "arterial" },
    { at: 107, name: { ja: "セカンド通り", en: "2nd St" }, w: "arterial" },
    { at: 0, name: { ja: "ニューモンゴメリー通り", en: "New Montgomery St" }, w: "minor" },
    { at: -153, name: { ja: "サード通り", en: "3rd St" }, w: "arterial" },
    { at: -413, name: { ja: "フォース通り", en: "4th St" }, w: "arterial" },
    { at: -673, name: { ja: "フィフス通り", en: "5th St" }, w: "arterial" },
    { at: -933, name: { ja: "シックス通り", en: "6th St" }, w: "arterial" },
    { at: -1193, name: { ja: "セブンス通り", en: "7th St" }, w: "arterial" },
    { at: -1453, name: { ja: "エイス通り", en: "8th St" }, w: "arterial" },
    { at: -1713, name: { ja: "ナインス通り", en: "9th St" }, w: "minor" }
  ];

  var SOMA_ALONG = [   // マーケット通りからの距離[m]（南東が正）
    { at: 113, name: { ja: "ミッション通り", en: "Mission St" }, w: "arterial" },
    { at: 175, name: { ja: "ミナ小路", en: "Minna St" }, w: "alley" },
    { at: 228, name: { ja: "ナトマ小路", en: "Natoma St" }, w: "alley" },
    { at: 300, name: { ja: "ハワード通り", en: "Howard St" }, w: "arterial" },
    { at: 360, name: { ja: "テハマ小路", en: "Tehama St" }, w: "alley" },
    { at: 415, name: { ja: "クレメンティナ小路", en: "Clementina St" }, w: "alley" },
    { at: 490, name: { ja: "フォルサム通り", en: "Folsom St" }, w: "arterial" },
    { at: 585, name: { ja: "シップリー小路", en: "Shipley St" }, w: "alley" },
    { at: 680, name: { ja: "ハリソン通り", en: "Harrison St" }, w: "arterial" },
    { at: 775, name: { ja: "ペリー小路", en: "Perry St" }, w: "alley" },
    { at: 870, name: { ja: "ブライアント通り", en: "Bryant St" }, w: "arterial" },
    { at: 1060, name: { ja: "ブラナン通り", en: "Brannan St" }, w: "arterial" },
    { at: 1250, name: { ja: "タウンゼント通り", en: "Townsend St" }, w: "arterial" },
    { at: 1440, name: { ja: "キング通り", en: "King St" }, w: "arterial" }
  ];

  /* マーケット通りの北西側（金融街・ユニオンスクエア・チャイナタウン） */
  var FIDI_NS = [      // 原点から東へ[m]
    { at: 640, name: { ja: "ドラム通り", en: "Drumm St" }, w: "minor" },
    { at: 512, name: { ja: "デイビス通り", en: "Davis St" }, w: "minor" },
    { at: 384, name: { ja: "フロント通り", en: "Front St" }, w: "minor" },
    { at: 256, name: { ja: "バッテリー通り", en: "Battery St" }, w: "arterial" },
    { at: 128, name: { ja: "サンサム通り", en: "Sansome St" }, w: "arterial" },
    { at: 0, name: { ja: "モンゴメリー通り", en: "Montgomery St" }, w: "arterial" },
    { at: -128, name: { ja: "カーニー通り", en: "Kearny St" }, w: "arterial" },
    { at: -256, name: { ja: "グラント通り", en: "Grant Ave" }, w: "minor" },
    { at: -384, name: { ja: "ストックトン通り", en: "Stockton St" }, w: "arterial" },
    { at: -512, name: { ja: "パウエル通り", en: "Powell St" }, w: "arterial" },
    { at: -640, name: { ja: "メイソン通り", en: "Mason St" }, w: "minor" },
    { at: -768, name: { ja: "テイラー通り", en: "Taylor St" }, w: "minor" },
    { at: -896, name: { ja: "ジョーンズ通り", en: "Jones St" }, w: "minor" },
    { at: -1024, name: { ja: "リーブンワース通り", en: "Leavenworth St" }, w: "minor" },
    { at: -1152, name: { ja: "ハイド通り", en: "Hyde St" }, w: "minor" }
  ];

  var FIDI_EW = [      // 原点から北へ[m]
    { at: -370, name: { ja: "エディ通り", en: "Eddy St" }, w: "minor" },
    { at: -278, name: { ja: "エリス通り", en: "Ellis St" }, w: "minor" },
    { at: -186, name: { ja: "オファレル通り", en: "O'Farrell St" }, w: "arterial" },
    { at: -94, name: { ja: "ギアリー通り", en: "Geary St" }, w: "arterial" },
    { at: 0, name: { ja: "ポスト通り", en: "Post St" }, w: "arterial" },
    { at: 92, name: { ja: "サター通り", en: "Sutter St" }, w: "arterial" },
    { at: 184, name: { ja: "ブッシュ通り", en: "Bush St" }, w: "arterial" },
    { at: 276, name: { ja: "パイン通り", en: "Pine St" }, w: "arterial" },
    { at: 368, name: { ja: "カリフォルニア通り", en: "California St" }, w: "arterial" },
    { at: 460, name: { ja: "サクラメント通り", en: "Sacramento St" }, w: "minor" },
    { at: 552, name: { ja: "クレイ通り", en: "Clay St" }, w: "minor" },
    { at: 644, name: { ja: "ワシントン通り", en: "Washington St" }, w: "minor" },
    { at: 736, name: { ja: "ジャクソン通り", en: "Jackson St" }, w: "minor" },
    { at: 828, name: { ja: "パシフィック通り", en: "Pacific Ave" }, w: "minor" },
    { at: 920, name: { ja: "ブロードウェイ", en: "Broadway" }, w: "arterial" },
    { at: 1012, name: { ja: "バレーホ通り", en: "Vallejo St" }, w: "minor" },
    { at: 1104, name: { ja: "グリーン通り", en: "Green St" }, w: "minor" },
    { at: 1196, name: { ja: "ユニオン通り", en: "Union St" }, w: "minor" },
    { at: 1288, name: { ja: "フィルバート通り", en: "Filbert St" }, w: "minor" },
    { at: 1380, name: { ja: "グリニッジ通り", en: "Greenwich St" }, w: "minor" },
    { at: 1472, name: { ja: "ロンバード通り", en: "Lombard St" }, w: "arterial" }
  ];

  /* ---- 海岸線。フェリービルディングからピア39の方へ湾曲する ---- */
  var SHORE_M = [      // [東, 北] メートル
    [1700, -900], [1500, -430], [1330, -60], [1222, 134], [1010, 430],
    [820, 630], [762, 706], [700, 870], [560, 1150], [350, 1460],
    [100, 1720], [-246, 1792], [-712, 2149], [-1200, 2260], [-1700, 2300]
  ];

  /* ======================================================================
     幾何
     ====================================================================== */
  function add(p, q) { return [p[0] + q[0], p[1] + q[1]]; }
  function mul(v, k) { return [v[0] * k, v[1] * k]; }

  /** 半平面 n·p <= d で線分を切る。街区の外や、マーケット通りの向こう側を落とす。 */
  function clipSeg(p0, p1, planes) {
    var t0 = 0, t1 = 1;
    var dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    for (var i = 0; i < planes.length; i++) {
      var n = planes[i].n, d = planes[i].d;
      var num = d - (n[0] * p0[0] + n[1] * p0[1]);
      var den = n[0] * dx + n[1] * dy;
      if (Math.abs(den) < 1e-9) { if (num < 0) return null; continue; }
      var t = num / den;
      if (den > 0) { if (t < t1) t1 = t; } else if (t > t0) t0 = t;
      if (t0 > t1 - 1e-6) return null;
    }
    return [[p0[0] + dx * t0, p0[1] + dy * t0], [p0[0] + dx * t1, p0[1] + dy * t1]];
  }

  var BOX = [
    { n: [-1, 0], d: -EXTENT.x0 }, { n: [1, 0], d: EXTENT.x1 },
    { n: [0, -1], d: -EXTENT.y0 }, { n: [0, 1], d: EXTENT.y1 }
  ];
  var NORTH_OF_MARKET = { n: CROSS, d: 0 };                  // マーケット通りより北西だけ残す
  var SOUTH_OF_MARKET = { n: [-CROSS[0], -CROSS[1]], d: 0 }; // 〃 南東だけ残す

  function longSeg(origin, d) {
    var h = u(6000);
    return [add(origin, mul(d, -h)), add(origin, mul(d, h))];
  }

  /** 通りを1本ぶん作る。マーケット通りで切り、描画範囲で切る。 */
  function street(origin, d, side, meta) {
    var planes = BOX.concat([side]);
    var s = longSeg(origin, d);
    var seg = clipSeg(s[0], s[1], planes);
    if (!seg) return null;
    return { pts: seg, name: meta.name, w: meta.w };
  }

  function buildStreets() {
    var out = [];
    var i;

    /* マーケット通り。この街でいちばん目立つ1本なので、切らずに通す。 */
    var mk = clipSeg(longSeg([0, 0], MARKET)[0], longSeg([0, 0], MARKET)[1], BOX);
    out.push({ pts: mk, name: { ja: "マーケット通り", en: "Market St" }, w: "market" });

    for (i = 0; i < SOMA_ALONG.length; i++) {
      var sa = SOMA_ALONG[i];
      var s1 = street(mul(CROSS, u(sa.at)), MARKET, SOUTH_OF_MARKET, sa);
      if (s1) out.push(s1);
    }
    for (i = 0; i < SOMA_CROSS.length; i++) {
      var sc = SOMA_CROSS[i];
      var s2 = street(mul(MARKET, u(sc.at)), CROSS, SOUTH_OF_MARKET, sc);
      if (s2) out.push(s2);
    }
    for (i = 0; i < FIDI_EW.length; i++) {
      var fe = FIDI_EW[i];
      var s3 = street(mul(NS, u(fe.at)), EW, NORTH_OF_MARKET, fe);
      if (s3) out.push(s3);
    }
    for (i = 0; i < FIDI_NS.length; i++) {
      var fn = FIDI_NS[i];
      var s4 = street(mul(EW, u(fn.at)), NS, NORTH_OF_MARKET, fn);
      if (s4) out.push(s4);
    }
    return out;
  }

  /* ---- 海と埠頭 ---- */
  function shorePts() {
    return SHORE_M.map(function (p) { return fidi(p[0], p[1]); });
  }

  /** 海：海岸線をたどってから、描画範囲の北・東の縁を回って閉じる */
  function waterPolygon() {
    var pts = shorePts().slice();
    var last = pts[pts.length - 1], first = pts[0];
    pts.push([last[0], EXTENT.y0]);
    pts.push([EXTENT.x1, EXTENT.y0]);
    pts.push([EXTENT.x1, EXTENT.y1]);
    pts.push([first[0], EXTENT.y1]);
    return pts;
  }

  /** エンバカデロ（海岸線の90m内陸を走る） */
  function embarcadero() {
    var s = shorePts();
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      /* 進行方向の右手（dy, -dx）が陸側 */
      out.push([s[i][0] + (dy / len) * u(90), s[i][1] - (dx / len) * u(90)]);
    }
    return out;
  }

  /** 埠頭。フェリービルディングより北に、海へ突き出す形で並べる。 */
  function piers() {
    var s = shorePts();
    var out = [];
    for (var i = 5; i < s.length - 3; i++) {
      var a = s[i], b = s[i + 1];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var steps = Math.max(1, Math.round(len / u(180)));
      for (var k = 0; k < steps; k++) {
        var t = (k + 0.5) / steps;
        var p = [a[0] + dx * t, a[1] + dy * t];
        var nx = -dy / len, ny = dx / len;           // 沖向き
        var wx = dx / len, wy = dy / len;
        var L = u(130), W = u(22);
        out.push([
          [p[0] - wx * W, p[1] - wy * W],
          [p[0] - wx * W + nx * L, p[1] - wy * W + ny * L],
          [p[0] + wx * W + nx * L, p[1] + wy * W + ny * L],
          [p[0] + wx * W, p[1] + wy * W]
        ]);
      }
    }
    return out;
  }

  /* ---- 高速道路：ベイブリッジとその取付部（SoMaを斜めに横切る） ---- */
  function freeways() {
    return [
      {
        name: { ja: "ベイブリッジ / I-80", en: "Bay Bridge / I-80" },
        pts: [grid(-1500, 1500), grid(-900, 1150), grid(-200, 800), grid(500, 560),
          fidi(1000, 180), fidi(1450, 260), fidi(2100, 500)]
      }
    ];
  }

  /* ---- 公園・広場 ---- */
  var PARKS = [
    { name: { ja: "ユニオン・スクエア", en: "Union Square" }, c: fidi(-430, -110), r: [u(115), u(115)] },
    { name: { ja: "ポーツマス広場", en: "Portsmouth Square" }, c: fidi(-180, 520), r: [u(70), u(80)] },
    { name: { ja: "ワシントン・スクエア", en: "Washington Square" }, c: fidi(-330, 1240), r: [u(95), u(85)] },
    { name: { ja: "ヤーバ・ブエナ・ガーデンズ", en: "Yerba Buena Gardens" }, c: grid(-320, 400), r: [u(110), u(90)] },
    { name: { ja: "サウス・パーク", en: "South Park" }, c: grid(-120, 790), r: [u(80), u(35)] },
    { name: { ja: "エンバカデロ・プラザ", en: "Embarcadero Plaza" }, c: grid(880, -130), r: [u(90), u(70)] },
    { name: { ja: "リンコン・パーク", en: "Rincon Park" }, c: grid(870, 320), r: [u(110), u(45)] }
  ];

  /* ---- 目印。地図を見た人が「サンフランシスコだ」と分かるもの ---- */
  var LANDMARKS = [
    { ja: "フェリー・ビルディング", en: "Ferry Building", at: grid(955, -20) },
    { ja: "トランスアメリカ・ピラミッド", en: "Transamerica Pyramid", at: fidi(10, 600) },
    { ja: "モスコーニ・センター", en: "Moscone Center", at: grid(-420, 395) },
    { ja: "サンフランシスコ近代美術館", en: "SFMOMA", at: grid(-250, 195) },
    { ja: "オラクル・パーク", en: "Oracle Park", at: grid(-230, 1500) },
    { ja: "コイト・タワー", en: "Coit Tower", at: fidi(90, 1180) },
    { ja: "ケーブルカー博物館", en: "Cable Car Museum", at: fidi(-700, 620) }
  ];

  /* ---- 地区名。Googleマップでいう薄いグレーの大きな文字 ---- */
  var DISTRICTS = [
    { ja: "金融街", en: "FINANCIAL DISTRICT", at: fidi(190, 420) },
    { ja: "ユニオン・スクエア", en: "UNION SQUARE", at: fidi(-480, -250) },
    { ja: "チャイナタウン", en: "CHINATOWN", at: fidi(-330, 700) },
    { ja: "ノース・ビーチ", en: "NORTH BEACH", at: fidi(-180, 1330) },
    { ja: "エンバカデロ", en: "EMBARCADERO", at: fidi(430, 1000) },
    { ja: "ソーマ", en: "SOMA", at: grid(-800, 700) },
    { ja: "ヤーバ・ブエナ", en: "YERBA BUENA", at: grid(-480, 330) },
    { ja: "リンコン・ヒル", en: "RINCON HILL", at: grid(600, 600) },
    { ja: "ミッション・ベイ", en: "MISSION BAY", at: grid(-180, 1750) },
    { ja: "ノブ・ヒル", en: "NOB HILL", at: fidi(-830, 560) },
    { ja: "テンダーロイン", en: "TENDERLOIN", at: fidi(-900, -240) }
  ];

  var BAY = { ja: "サンフランシスコ湾", en: "San Francisco Bay", at: fidi(1500, 900) };

  /* ======================================================================
     デモの登場人物の位置（すべて実在の交差点の上に置く）
     ====================================================================== */
  var PLACES = {
    station_locker: grid(0, -8),        // マーケット通り × モンゴメリー通り（駅の入口）
    office: grid(470, 190),             // ミッション通り × フリーモント通り（セールスフォース・タワー）
    konbini: grid(107, 300),            // セカンド通り × ハワード通り
    home_door: grid(-153, 490),         // サード通り × フォルサム通り
    home_locker: grid(-73, 620),        // 同じ建物のロビー
    indoor: grid(-270, 620),            // 同じ建物の屋内
    friend: grid(-333, 460)             // 少し西の、同じ並びの建物
  };

  var DEPOT = grid(-1193, 1060);        // セブンス通り × ブラナン通り（物流の集まる一帯）

  /* 通勤の徒歩ルート：勤務先 → マーケット通り → サード通り → 自宅。
     モンゴメリー駅はこの道の上にある。 */
  var WALK = [
    grid(470, 190), grid(430, 70), grid(367, 0), grid(107, 0), grid(0, 0),
    grid(-153, 0), grid(-153, 300), grid(-153, 490)
  ];

  /* ======================================================================
     通りの網（グラフ）
     交差点で通りを切って、点と線のつながりにする。こうしておくと
     配送車も人も、街区を突っ切らずに道なりに動かせる。
     ====================================================================== */
  var GRAPH = null;

  function segIntersect(p, p2, q, q2) {
    var rx = p2[0] - p[0], ry = p2[1] - p[1];
    var sx = q2[0] - q[0], sy = q2[1] - q[1];
    var denom = rx * sy - ry * sx;
    if (Math.abs(denom) < 1e-9) return null;                 // 平行
    var t = ((q[0] - p[0]) * sy - (q[1] - p[1]) * sx) / denom;
    var u = ((q[0] - p[0]) * ry - (q[1] - p[1]) * rx) / denom;
    if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
    return t;
  }
  function key(x, y) { return Math.round(x * 4) + "," + Math.round(y * 4); }
  function dist2(a, b) {
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** すべての通りを1本ずつ、線分の並びとして集める */
  function allLines() {
    var out = buildStreets().map(function (s) { return s.pts; });
    out.push(embarcadero());
    return out;
  }

  function buildGraph() {
    var lines = allLines();
    var nodes = {};      // key -> {id, xy}
    var list = [];
    var adj = [];

    function node(xy) {
      var k = key(xy[0], xy[1]);
      if (!nodes[k]) {
        nodes[k] = { id: list.length, xy: xy };
        list.push(xy);
        adj.push([]);
      }
      return nodes[k].id;
    }
    function link(a, b) {
      if (a === b) return;
      var w = dist2(list[a], list[b]);
      adj[a].push({ to: b, w: w });
      adj[b].push({ to: a, w: w });
    }

    /* 各線分を、他の線分との交点で切る */
    for (var i = 0; i < lines.length; i++) {
      for (var s = 1; s < lines[i].length; s++) {
        var a = lines[i][s - 1], b = lines[i][s];
        var cuts = [0, 1];
        for (var j = 0; j < lines.length; j++) {
          if (j === i) continue;
          for (var u = 1; u < lines[j].length; u++) {
            var t = segIntersect(a, b, lines[j][u - 1], lines[j][u]);
            if (t !== null) cuts.push(Math.max(0, Math.min(1, t)));
          }
        }
        cuts.sort(function (x, y) { return x - y; });
        var prev = null;
        for (var c = 0; c < cuts.length; c++) {
          if (prev !== null && cuts[c] - prev < 1e-4) continue;
          var xy = [a[0] + (b[0] - a[0]) * cuts[c], a[1] + (b[1] - a[1]) * cuts[c]];
          var id = node(xy);
          if (prev !== null) link(node([a[0] + (b[0] - a[0]) * prev, a[1] + (b[1] - a[1]) * prev]), id);
          prev = cuts[c];
        }
      }
    }
    return { xy: list, adj: adj };
  }

  function graph() {
    if (!GRAPH) GRAPH = buildGraph();
    return GRAPH;
  }

  /** ある点を通りの上に寄せて、その辺の両端につないだ仮の点を返す */
  function attach(g, p, extra) {
    var best = null;
    for (var i = 0; i < g.adj.length; i++) {
      for (var e = 0; e < g.adj[i].length; e++) {
        var j = g.adj[i][e].to;
        if (j < i) continue;
        var a = g.xy[i], b = g.xy[j];
        var vx = b[0] - a[0], vy = b[1] - a[1];
        var len2 = vx * vx + vy * vy;
        var t = len2 === 0 ? 0 : ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2;
        t = Math.max(0, Math.min(1, t));
        var x = a[0] + vx * t, y = a[1] + vy * t;
        var d = dist2([x, y], p);
        if (!best || d < best.d) best = { d: d, xy: [x, y], a: i, b: j };
      }
    }
    if (!best) return null;
    var id = g.xy.length + extra.length;
    extra.push({ id: id, xy: best.xy, links: [best.a, best.b] });
    return extra[extra.length - 1];
  }

  /** 通りに沿った最短経路。返すのは座標の並び。 */
  function route(from, to) {
    var g = graph();
    var extra = [];
    var A = attach(g, from, extra);
    var B = attach(g, to, extra);
    if (!A || !B) return [from, to];

    var n = g.xy.length + extra.length;
    function xyOf(i) { return i < g.xy.length ? g.xy[i] : extra[i - g.xy.length].xy; }
    function neighbours(i) {
      if (i < g.xy.length) {
        var out = g.adj[i].slice();
        for (var k = 0; k < extra.length; k++) {
          if (extra[k].links.indexOf(i) !== -1) {
            out.push({ to: extra[k].id, w: dist2(g.xy[i], extra[k].xy) });
          }
        }
        return out;
      }
      var ex = extra[i - g.xy.length];
      return ex.links.map(function (j) { return { to: j, w: dist2(ex.xy, g.xy[j]) }; });
    }

    var INF = Infinity;
    var d = new Float64Array(n).fill(INF);
    var prev = new Int32Array(n).fill(-1);
    var done = new Uint8Array(n);
    d[A.id] = 0;
    /* 点の数は千のオーダーなので、毎回いちばん近い未確定点を探す素朴な形で足りる */
    for (var step = 0; step < n; step++) {
      var u = -1, bd = INF;
      for (var i2 = 0; i2 < n; i2++) if (!done[i2] && d[i2] < bd) { bd = d[i2]; u = i2; }
      if (u === -1 || u === B.id) break;
      done[u] = 1;
      var nb = neighbours(u);
      for (var k2 = 0; k2 < nb.length; k2++) {
        var v = nb[k2].to, nd = d[u] + nb[k2].w;
        if (nd < d[v]) { d[v] = nd; prev[v] = u; }
      }
    }
    if (d[B.id] === INF) return [from, to];

    var path = [];
    for (var cur = B.id; cur !== -1; cur = prev[cur]) path.push(xyOf(cur));
    path.reverse();
    /* 通りに寄せた分の最後のひと跨ぎ（地点そのものまで）を足す */
    if (dist2(path[path.length - 1], to) > 0.5) path.push(to);
    if (dist2(path[0], from) > 0.5) path.unshift(from);
    return path;
  }

  /** 配送車のルート：物流拠点から、通りに沿って目的地まで */
  function vanRoute(target) { return route(DEPOT, target); }

  /** 地図の座標 → マーケット格子（m） */
  function toGrid(p) {
    var x = p[0] * UNIT_M, y = p[1] * UNIT_M;
    return { along: x * MARKET[0] + y * MARKET[1], cross: x * CROSS[0] + y * CROSS[1] };
  }

  return {
    ANCHOR: ANCHOR, UNIT_M: UNIT_M, EXTENT: EXTENT, FOCUS: FOCUS,
    ll: ll, u: u, grid: grid, fidi: fidi, toGrid: toGrid,
    streets: buildStreets,
    water: waterPolygon, shore: shorePts, embarcadero: embarcadero, piers: piers,
    freeways: freeways,
    PARKS: PARKS, LANDMARKS: LANDMARKS, DISTRICTS: DISTRICTS, BAY: BAY,
    PLACES: PLACES, DEPOT: DEPOT, WALK: WALK,
    route: route, vanRoute: vanRoute
  };
})();
