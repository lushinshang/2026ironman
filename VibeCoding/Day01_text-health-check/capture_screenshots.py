import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

async def capture():
    target_dir = Path("/Users/<USER>/projects/2_Practice/tools/2026ironman/VibeCoding/Day01_text-health-check")
    html_file = target_dir / "index.html"
    if not html_file.is_file():
        #  fallback to tools/text-health-check.html
        html_file = Path("/Users/<USER>/projects/2_Practice/tools/2026ironman/VibeCoding/tools/text-health-check.html")
    
    url = f"file://{html_file.resolve()}"
    print(f"Loading {url}")

    sample_text = """【急件簽呈】關於本機關資安基礎設施巡檢與公文排版規範說明

為全面落實機關內部資安防禦，各單位在處理敏感公文與合約送審時，務必遵守標準排版規範。近期稽核發現部分公文存在格式混亂問題，包含連續半形空格  以及連續全形空格　　混用，甚至出現重複驚嘆號！！與重複問號？？等不規範標點符號。

此外，單一段落字數切勿超過三百字以上，以避免長官在手機直屏或公文系統上審核時造成嚴重的閱讀疲勞與滑動困難。本文字健檢工作台將在瀏覽器端即時計算全形半形中英文字元數、統計連續空白、重複標點、多餘空白行與過長段落，所有資料全程於本機記憶體處理，絕不上傳至任何外部雲端伺服器，切實保障機密安全。"""

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # 1. 桌面版截圖 (1280x800)
        page_desktop = await browser.new_page(viewport={"width": 1280, "height": 850})
        await page_desktop.goto(url)
        # 輸入示範資料
        textarea = page_desktop.locator("textarea#input-text, textarea").first
        await textarea.fill(sample_text)
        await page_desktop.wait_for_timeout(300) # 等待 debounce
        desktop_img = target_dir / "screenshot_desktop.png"
        await page_desktop.screenshot(path=str(desktop_img), full_page=False)
        print(f"Captured desktop screenshot: {desktop_img}")

        # 2. 手機版直屏截圖 (390x844 iPhone 14)
        page_mobile = await browser.new_page(viewport={"width": 390, "height": 844})
        await page_mobile.goto(url)
        textarea_mobile = page_mobile.locator("textarea#input-text, textarea").first
        await textarea_mobile.fill(sample_text)
        await page_mobile.wait_for_timeout(300)
        mobile_img = target_dir / "screenshot_mobile.png"
        await page_mobile.screenshot(path=str(mobile_img), full_page=False)
        print(f"Captured mobile screenshot: {mobile_img}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture())
