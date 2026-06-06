# 🚀 寵妻神器 — 完整部署指南

## 事前準備（5 分鐘）

### 必填帳號
- [Anthropic Console](https://console.anthropic.com) — 取得 `ANTHROPIC_API_KEY`
- [Supabase](https://supabase.com) — 免費，資料庫 + 登入系統

### 選填帳號（功能加強）
- [Resend](https://resend.com) — 廠商開發信真實發送（免費 3,000 封/月）
- Google Cloud Console — 廠商搜尋真實資料（免費 100 次/天）

---

## 第一步：建立 Supabase 資料庫

1. 到 [Supabase](https://supabase.com) → 建立新專案
2. 進入 **SQL Editor** → 貼入並執行 `supabase/schema.sql`（專案資料夾內）
3. 記下以下三個值：
   - `Project URL`（Settings → API → Project URL）
   - `anon public key`（Settings → API → anon）
   - `service_role key`（Settings → API → service_role）⚠️ 只給後端用

---

## 第二步：部署後端 → Railway

1. 到 [Railway](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. 選擇 repo，設定根目錄為 `backend/`
3. **環境變數**（Settings → Variables）：

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 金鑰 | ✅ |
| `SUPABASE_URL` | Supabase Project URL | ✅ 知識庫持久化 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | ✅ 知識庫持久化 |
| `RESEND_API_KEY` | Resend API 金鑰 | 選填（發信功能）|
| `RESEND_FROM_EMAIL` | 寄件人 Email | 選填（發信功能）|
| `GOOGLE_API_KEY` | Google API 金鑰 | 選填（廠商搜尋加強）|
| `GOOGLE_CSE_ID` | Google Custom Search Engine ID | 選填（廠商搜尋加強）|

4. 部署完成後複製 Railway 提供的網址（如 `https://xxx.up.railway.app`）

---

## 第三步：部署前端 → Vercel

1. 到 [Vercel](https://vercel.com) → **New Project** → 選 GitHub repo
2. 設定根目錄為 `frontend/`
3. **環境變數**：

| 變數名稱 | 值 |
|---------|---|
| `NEXT_PUBLIC_API_URL` | Railway 後端網址（如 `https://xxx.up.railway.app`）|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（公開，可給前端）|

4. Deploy → 完成！

---

## 本機開發

```bash
# 後端（終端機 1）
cd backend
cp .env.example .env
# 編輯 .env，至少填入 ANTHROPIC_API_KEY
# 建議也填 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# 看到 Application startup complete ✅

# 前端（終端機 2）
cd frontend
# .env.local 已有 Supabase 設定，確認 NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
# 開啟 http://localhost:3000
```

---

## 驗證部署成功

- 後端健康檢查：`GET https://你的railway網址/` → 應回傳 `{"status":"ok","app":"寵妻神器 API v1.1"}`
- 前端：打開 Vercel 網址，看到寵妻神器介面
- 登入：點「☁️ 登入同步」→ 輸入 Email → 收到魔法連結 → 登入成功 → 右上角顯示綠點

---

## 功能說明

| 功能 | 需要的環境變數 |
|------|--------------|
| 報告生成 / DM 分析 / 文案 | `ANTHROPIC_API_KEY` |
| 登入 / 資料雲端同步 | Supabase（前端 anon key）|
| 個人知識庫持久化 | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| 廠商開發信真實發送 | `RESEND_API_KEY` + `RESEND_FROM_EMAIL` |
| 廠商真實資料搜尋強化 | `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` |

---

## 每日維護

- 廠商搜尋排程：後端每天 **08:00（台灣時間）** 自動執行
- 知識庫備份：首頁 → 知識庫 → **📦 匯出知識包** → 存入 Google Drive
- API 文件：`https://你的railway網址/docs`
