from dotenv import load_dotenv
load_dotenv()

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from routers import module1, module2, module3, module4, module5, knowledge, calendar

# ── 每日排程：自動搜尋廠商 ──────────────────────────────────────
scheduler = AsyncIOScheduler(timezone="Asia/Taipei")

async def daily_vendor_scan():
    """每天早上 8:00 自動掃描新廠商"""
    print("[排程] 開始每日廠商自動掃描...")
    try:
        from routers.module3 import search_tw_companies_gov
        categories = [("健康飲品", "飲料"), ("即食輕食", "食品"), ("冷凍熟食", "冷凍食品")]
        results = []
        for keyword, cat in categories:
            companies = await search_tw_companies_gov(keyword, cat)
            results.extend(companies[:3])
        print(f"[排程] 完成，找到 {len(results)} 筆廠商資料")
    except Exception as e:
        print(f"[排程] 廠商掃描失敗：{e}")

async def daily_market_scan():
    """每天早上 08:05 自動掃描市場商機（商機雷達）"""
    print("[排程] 開始每日商機雷達掃描...")
    try:
        from routers.module5 import _run_daily_scan, _daily_cache
        from datetime import datetime
        report = await _run_daily_scan()
        _daily_cache["date"]   = datetime.now().strftime("%Y-%m-%d")
        _daily_cache["report"] = report
        total = sum(len(v) for v in report.get("categories", {}).values())
        print(f"[排程] 商機雷達完成，共掃描 {total} 筆資料")
    except Exception as e:
        print(f"[排程] 商機雷達掃描失敗：{e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動時開始排程
    scheduler.add_job(daily_vendor_scan,  "cron", hour=8, minute=0,  id="daily_vendor_scan")
    scheduler.add_job(daily_market_scan,  "cron", hour=8, minute=5,  id="daily_market_scan")
    scheduler.start()
    print("[排程] 每日排程已設定：廠商掃描 08:00 / 商機雷達 08:05")
    yield
    # 關閉時停止排程
    scheduler.shutdown()

# ── FastAPI App ──────────────────────────────────────────────────
app = FastAPI(title="寵妻神器 API", version="1.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(module1.router, prefix="/api/module1", tags=["週報自駕"])
app.include_router(module2.router, prefix="/api/module2", tags=["DM分析"])
app.include_router(module3.router, prefix="/api/module3", tags=["廠商星探"])
app.include_router(module4.router,    prefix="/api/module4",    tags=["口碑機"])
app.include_router(module5.router,    prefix="/api/module5",    tags=["商機雷達"])
app.include_router(knowledge.router,  prefix="/api/knowledge",  tags=["個人知識庫"])
app.include_router(calendar.router,   prefix="/api/calendar",   tags=["行事曆"])

@app.get("/")
def health():
    return {"status": "ok", "app": "寵妻神器 API v1.2", "scheduler": "running"}

@app.post("/api/admin/trigger_vendor_scan")
async def trigger_vendor_scan():
    """手動觸發廠商掃描（測試用）"""
    asyncio.create_task(daily_vendor_scan())
    return {"message": "廠商掃描已觸發，請稍後查看 /api/module3/daily_vendors"}
