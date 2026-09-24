-- ==========================================================================
-- LAST METERS — 需要検証アンケートの保存先 / demand validation survey store
--
-- 保存するのは回答内容だけ。氏名・メールアドレス・IPアドレス・
-- User-Agent は保存しない（本人を特定できる情報を持たないため）。
-- 端末を区別する client_id は端末側で生成したランダム値で、個人とは紐づかない。
--
--   npx wrangler d1 execute lastmeters-survey --remote --file=./worker/schema.sql
-- ==========================================================================

CREATE TABLE IF NOT EXISTS responses (
  id          TEXT PRIMARY KEY,           -- 端末側で採番（二重送信を弾くため）
  created_at  TEXT NOT NULL,              -- サーバー側のISO8601（端末時計を信用しない）
  client_at   TEXT,                       -- 端末側の時刻（時差の参考）
  client_id   TEXT,                       -- 端末を区別するだけのランダム値
  lang        TEXT,                       -- 回答時の表示言語 en / ja
  role        TEXT NOT NULL,              -- 立場（必須）
  intent      INTEGER NOT NULL,           -- 利用意向 1..5（必須）
  freq        TEXT,                       -- 受け取れない頻度
  scenes      TEXT,                       -- 刺さる場面（| 区切り）
  wtp         INTEGER,                    -- 支払意思額（-1 = 使わない）
  fears       TEXT,                       -- 不安（| 区切り）
  note        TEXT,                       -- 自由記述
  autonomy    INTEGER,                    -- 回答時の自律レベル L0..L4
  source      TEXT                        -- どのページから回答したか
);

-- 集計でよく使う軸にだけ索引を張る
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses (created_at);
CREATE INDEX IF NOT EXISTS idx_responses_role       ON responses (role);
