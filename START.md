# 🚀 寵妻神器 — 本地啟動指南

## 第一次設定（只需做一次）

### 1. 後端設定
```bash
cd backend
cp .env.example .env
# 用文字編輯器打開 .env，填入你的 ANTHROPIC_API_KEY
pip3 install -r requirements.txt
```

### 2. 前端設定
```bash
cd frontend
cp .env.local.example .env.local
npm install
```

---

## 每次啟動（開兩個終端機）

### 終端機 1 — 後端
```bash
cd backend
uvicorn main:app --reload --port 8000
```
看到 `Application startup complete` 表示成功 ✅

### 終端機 2 — 前端
```bash
cd frontend
npm run dev
```
看到 `Local: http://localhost:3000` 表示成功 ✅

### 開啟瀏覽器
打開 → **http://localhost:3000**

---

## API 文件
後端啟動後可查看：http://localhost:8000/docs
