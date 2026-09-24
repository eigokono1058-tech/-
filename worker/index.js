/* ==========================================================================
   DELIVERY OS — Cloudflare Worker
   --------------------------------------------------------------------------
   役割は2つだけ。

   1. /api/* を処理する
        POST /api/survey        アンケートの回答を1件受け取ってD1に保存する
        GET  /api/survey/stats  集計結果を返す（個々の回答は返さない）
        GET  /api/survey/export 全件をCSVで返す（ADMIN_TOKEN が必要）
   2. それ以外はすべて静的アセット（サイト本体）を返す

   静的アセットは既定でWorkerより先に返るので、ここに来るのは
   実在しないパスと /api/* だけ。run_worker_first は使っていない。

   保存しない情報: 氏名・メールアドレス・IPアドレス・User-Agent。
   ========================================================================== */

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

/** 回答が入りうる値。ここに無い値は弾く（フォーム改変や誤送信をそのまま保存しない） */
const ALLOWED = {
  role: ["consumer", "carrier", "ec", "realestate", "builder", "other"],
  freq: ["never", "monthly", "weekly", "often"],
  scenes: ["frozen", "absent", "redeliver", "medicine", "valuable", "travel", "delegate", "onthego"],
  fears: ["theft", "privacy", "security", "ai_trust", "cost", "complex", "none"],
  wtp: [0, 100, 300, 500, 1000, -1],
  lang: ["en", "ja"]
};

const NOTE_MAX = 1000;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

function pickOne(value, allowed) {
  return allowed.indexOf(value) !== -1 ? value : null;
}

function pickMany(value, allowed, max) {
  if (!Array.isArray(value)) return [];
  const seen = [];
  for (const v of value) {
    if (allowed.indexOf(v) !== -1 && seen.indexOf(v) === -1) seen.push(v);
    if (seen.length >= max) break;
  }
  return seen;
}

/** 端末から届いた回答を、保存してよい形に削ぎ落とす */
function sanitize(input) {
  const role = pickOne(input.role, ALLOWED.role);
  const intent = Number(input.intent);
  if (!role) return { error: "role is required" };
  if (!Number.isInteger(intent) || intent < 1 || intent > 5) {
    return { error: "intent must be an integer between 1 and 5" };
  }

  const id = typeof input.id === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(input.id)
    ? input.id
    : crypto.randomUUID();
  const clientId = typeof input.clientId === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(input.clientId)
    ? input.clientId
    : null;

  const autonomy = Number(input.autonomy);

  return {
    row: {
      id,
      created_at: new Date().toISOString(),
      client_at: typeof input.at === "string" ? input.at.slice(0, 40) : null,
      client_id: clientId,
      lang: pickOne(input.lang, ALLOWED.lang),
      role,
      intent,
      freq: pickOne(input.freq, ALLOWED.freq),
      scenes: pickMany(input.scenes, ALLOWED.scenes, 3).join("|"),
      wtp: ALLOWED.wtp.indexOf(Number(input.wtp)) !== -1 ? Number(input.wtp) : null,
      fears: pickMany(input.fears, ALLOWED.fears, ALLOWED.fears.length).join("|"),
      note: typeof input.note === "string" ? input.note.trim().slice(0, NOTE_MAX) : "",
      autonomy: Number.isInteger(autonomy) && autonomy >= 0 && autonomy <= 4 ? autonomy : null,
      source: typeof input.source === "string" ? input.source.slice(0, 80) : null
    }
  };
}

async function postSurvey(request, env) {
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, error: "invalid JSON" }, 400);
  }

  const { row, error } = sanitize(input);
  if (error) return json({ ok: false, error }, 400);

  try {
    // 同じidの再送はUPSERTせず黙って無視する（回線が不安定な会場での二重送信対策）
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO responses
         (id, created_at, client_at, client_id, lang, role, intent, freq, scenes, wtp, fears, note, autonomy, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      row.id, row.created_at, row.client_at, row.client_id, row.lang, row.role,
      row.intent, row.freq, row.scenes, row.wtp, row.fears, row.note, row.autonomy, row.source
    ).run();

    return json({ ok: true, id: row.id, stored: result.meta.changes > 0 }, 201);
  } catch (e) {
    return json({ ok: false, error: "could not store the response" }, 500);
  }
}

/** 集計だけを返す。自由記述は最新のものを短く、回答者を特定できない形で返す。 */
async function getStats(env) {
  try {
    const [totals, byRole, byWtp, recent] = await env.DB.batch([
      env.DB.prepare(
        `SELECT COUNT(*) AS n,
                AVG(intent) AS avg_intent,
                SUM(CASE WHEN intent >= 4 THEN 1 ELSE 0 END) AS top2,
                SUM(CASE WHEN wtp > 0 THEN 1 ELSE 0 END) AS payers
           FROM responses`
      ),
      env.DB.prepare(
        `SELECT role, COUNT(*) AS n, AVG(intent) AS avg_intent
           FROM responses GROUP BY role`
      ),
      env.DB.prepare(`SELECT wtp, COUNT(*) AS n FROM responses GROUP BY wtp`),
      env.DB.prepare(
        `SELECT role, intent, note, created_at
           FROM responses
          WHERE note <> ''
          ORDER BY created_at DESC
          LIMIT 8`
      )
    ]);

    // scenes と fears は「|」で詰めてあるので、ここで展開して数える
    const multi = await env.DB.prepare(`SELECT scenes, fears FROM responses`).all();
    const scenes = {};
    const fears = {};
    for (const r of multi.results) {
      for (const s of String(r.scenes || "").split("|")) if (s) scenes[s] = (scenes[s] || 0) + 1;
      for (const f of String(r.fears || "").split("|")) if (f) fears[f] = (fears[f] || 0) + 1;
    }

    const t = totals.results[0] || {};
    return json({
      ok: true,
      total: t.n || 0,
      avgIntent: t.avg_intent || 0,
      top2: t.top2 || 0,
      payers: t.payers || 0,
      byRole: byRole.results,
      byWtp: byWtp.results,
      scenes,
      fears,
      recent: recent.results
    });
  } catch (e) {
    return json({ ok: false, error: "could not read the stats" }, 500);
  }
}

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 全件書き出し。イベント後に自分で回収するためのもので、トークンが要る。 */
async function exportCsv(request, env) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(request.url).searchParams.get("token");
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  const { results } = await env.DB.prepare(
    `SELECT id, created_at, client_at, client_id, lang, role, intent, freq,
            scenes, wtp, fears, note, autonomy, source
       FROM responses ORDER BY created_at`
  ).all();

  const head = Object.keys(results[0] || {
    id: "", created_at: "", client_at: "", client_id: "", lang: "", role: "", intent: "",
    freq: "", scenes: "", wtp: "", fears: "", note: "", autonomy: "", source: ""
  });
  const body = results.map((r) => head.map((k) => csvCell(r[k])).join(",")).join("\n");

  // ExcelでUTF-8を正しく開くためBOMを付ける
  return new Response("﻿" + head.join(",") + "\n" + body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="delivery-os-survey-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/survey" && request.method === "POST") {
        return postSurvey(request, env);
      }
      if (url.pathname === "/api/survey/stats" && request.method === "GET") {
        return getStats(env);
      }
      if (url.pathname === "/api/survey/export" && request.method === "GET") {
        return exportCsv(request, env);
      }
      return json({ ok: false, error: "not found" }, 404);
    }

    // 静的アセットに無いパスはサイトの404へ返す
    return env.ASSETS.fetch(request);
  }
};
