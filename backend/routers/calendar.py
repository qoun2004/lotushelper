"""
Google Calendar ICS 行事曆代理
- 接收前端傳來的 Google Calendar 私人 ICS URL
- 後端 fetch（避免 CORS 問題）
- 解析 VEVENT，回傳今日 + 本週行程 JSON
"""
import re
import httpx
from datetime import datetime, date, timedelta, timezone
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


def _parse_dt(dtstr: str):
    """解析 ICS 日期字串，回傳 (date, time_str, is_all_day)"""
    if not dtstr:
        return None, '', True

    # 去除可能的換行或空白
    dtstr = dtstr.strip().replace('\r', '').replace('\n', '')

    # 全天事件：YYYYMMDD（8碼，無 T）
    if re.match(r'^\d{8}$', dtstr):
        try:
            return datetime.strptime(dtstr, '%Y%m%d').date(), '', True
        except ValueError:
            return None, '', True

    # 日期時間：YYYYMMDDTHHMMSS 或 YYYYMMDDTHHMMSSZ（UTC）
    # 或帶連字號格式 YYYY-MM-DDTHH:MM:SS
    clean = dtstr.replace('-', '').replace(':', '').replace('Z', '')
    if 'T' in clean:
        base = clean.replace('T', '')
        try:
            dt = datetime.strptime(base[:14], '%Y%m%d%H%M%S')
            return dt.date(), dt.strftime('%H:%M'), False
        except ValueError:
            pass

    return None, '', True


def _unescape_ics(value: str) -> str:
    """反轉義 ICS 特殊字元"""
    return value.replace('\\n', '\n').replace('\\,', ',').replace('\\;', ';').replace('\\\\', '\\')


def parse_ics(content: str) -> list[dict]:
    """
    解析 ICS 文字，回傳今日 + 未來 7 天的事件清單。
    支援 VEVENT 的 line folding（RFC 5545）。
    """
    # 展開 line folding（下一行以空白或 tab 開頭表示繼續）
    content = re.sub(r'\r?\n[ \t]', '', content)

    today = date.today()
    week_end = today + timedelta(days=7)

    events = []
    for block in re.findall(r'BEGIN:VEVENT(.*?)END:VEVENT', content, re.DOTALL):
        ev_raw: dict[str, str] = {}
        for line in block.splitlines():
            line = line.rstrip('\r')
            if ':' not in line:
                continue
            # key 可能帶參數（如 DTSTART;TZID=Asia/Taipei），取分號前的部分為 key
            key_full, _, val = line.partition(':')
            key = key_full.split(';')[0].upper().strip()
            ev_raw[key] = val.strip()

        summary  = _unescape_ics(ev_raw.get('SUMMARY', '（未命名）'))[:80]
        location = _unescape_ics(ev_raw.get('LOCATION', ''))[:60]

        # 解析開始時間
        ev_date, ev_time, all_day = _parse_dt(ev_raw.get('DTSTART', ''))
        if ev_date is None:
            continue

        # 只保留今日到本週結束
        if not (today <= ev_date <= week_end):
            continue

        # 跳過已取消的事件
        if ev_raw.get('STATUS', '').upper() == 'CANCELLED':
            continue

        events.append({
            'summary':  summary,
            'date':     ev_date.strftime('%Y-%m-%d'),
            'time':     ev_time,
            'all_day':  all_day,
            'location': location,
            'is_today': ev_date == today,
        })

    # 排序：日期 → 時間（全天事件排最前）
    events.sort(key=lambda x: (x['date'], '' if x['all_day'] else (x['time'] or '99:99')))
    return events


@router.get("/events")
async def get_calendar_events(ics_url: str = ""):
    """
    代理抓取 Google Calendar ICS 並回傳今日＋本週行程。
    前端把 ICS URL 當 query param 傳入（儲存在 localStorage，不落 DB）。
    """
    if not ics_url or not ics_url.startswith('http'):
        return JSONResponse({"events": [], "error": "no_url"})

    try:
        async with httpx.AsyncClient(
            timeout=12, follow_redirects=True,
            headers={'User-Agent': 'Mozilla/5.0 寵妻神器 Calendar Proxy'}
        ) as client:
            res = await client.get(ics_url)

        if res.status_code != 200:
            return JSONResponse({"events": [], "error": f"HTTP {res.status_code}"})

        events = parse_ics(res.text)
        return JSONResponse({"events": events, "total": len(events)})

    except httpx.TimeoutException:
        return JSONResponse({"events": [], "error": "timeout"})
    except Exception as e:
        return JSONResponse({"events": [], "error": str(e)[:100]})
