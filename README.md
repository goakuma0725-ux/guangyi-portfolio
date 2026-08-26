# 光翊設計工作室 STUDIO HIKARI — 作品集網站

Astro 5 + Tailwind CSS v4 + Sveltia CMS，靜態輸出，部署到 Hostinger 共享主機。

## 本機開發

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 輸出到 dist/
npm run preview  # 預覽建置結果
```

`npm install` 與 `npm run build` 會自動先跑 `scripts/generate-static-assets.mjs`，產生 `public/line-qr.png`（LINE 的靜態 QR code，來源是 `src/data/site.json` 的 `lineUrl`）。

## 新增一件作品

**方法一：CMS 後台**（上線後）— 到 `/admin` 用 GitHub 帳號登入，「作品管理」新增一筆，填欄位、上傳圖片，儲存後會自動 commit 並觸發部署。

**方法二：直接改檔案**（本機開發時）
1. 在 `src/content/works/` 新增一個 `{slug}.md`，可參考 [hsinchu-bridge.md](src/content/works/hsinchu-bridge.md)。
2. 圖片放在 `src/content/works/{slug}/` 資料夾，在 frontmatter 用相對路徑引用（例如 `./{slug}/cover.jpg`）。
3. 必填欄位：`title`、`domain`（可複選：建築設計/工程模擬/室內設計/景觀模擬/產品模擬）、`service`（可複選：靜態透視圖/動畫/模擬分析/BIM）、`cover`。其餘欄位缺省時前端會自動不渲染該區塊。

## 圖片與影片規格速查

| 項目 | 規格 |
|---|---|
| 圖片長邊上限 | 1920px（Astro 建置時自動輸出 AVIF/WebP/JPG，多種寬度） |
| 圖片品質 | AVIF 72 / WebP 78 |
| 影片單檔 | ≤ 60 秒、≤ 40MB；全站自架影片總量建議 ≤ 500MB |
| 影片格式 | H.264 MP4，上傳前用 ffmpeg 轉檔（見下） |
| 影片欄位 | `video.src` 可填本機路徑（`/media/xxx.mp4`）或 YouTube/Vimeo 網址，元件會自動判斷 |

```bash
ffmpeg -i input.mov -c:v libx264 -profile:v high -crf 23 -preset slow \
  -vf "scale=-2:1080" -c:a aac -b:a 128k -movflags +faststart output.mp4
```

## 部署（GitHub Actions → Hostinger FTP）

1. 建立 GitHub 儲存庫，push 這份程式碼。
2. 到儲存庫 Settings → Secrets and variables → Actions，新增：
   - `FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD`（在 Hostinger hPanel 的「檔案管理 → FTP 帳戶」取得）
3. push 到 `main` 分支後，[.github/workflows/deploy.yml](.github/workflows/deploy.yml) 會自動 `npm ci && npm run build`，再把 `dist/` 同步到 `public_html/`。
4. 第一次部署前，建議先在 hPanel 對現有 `public_html/` 內容做一次備份。

**部署後看不到更新**：登入 Hostinger hPanel → LiteSpeed Cache → 「Flush All」。

## 設定 CMS 後台（Sveltia CMS）

後台網址 `/admin`，用 GitHub 帳號登入。因為只有您（或少數技術人員）在用後台，採用 Sveltia CMS 官方建議最簡單的 **Access Token** 登入方式，不需要架 OAuth App、不需要 Cloudflare Worker：

1. 打開 `https://nerdibility.com/admin`
2. 登入畫面按「**Sign In with Token**」
3. 依畫面指示連到 GitHub 產生一組 Personal Access Token（畫面會預先勾好需要的權限範圍）
4. 複製貼回登入視窗即可

Token 存在瀏覽器的 local storage，之後同一台電腦/瀏覽器不用重複登入。若未來需要讓多位非技術人員也能上稿，才需要改用完整的 OAuth 中繼（[sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) 部署到 Cloudflare Workers）。

## 待補的真實素材（目前用佔位/空白處理，不是假資料）

| 項目 | 現況 |
|---|---|
| Logo（深色版/淺色版） | 尚未提供，導覽列暫用純文字站名 |
| favicon | 用暫時的極簡黃十字圖形（[public/favicon.svg](public/favicon.svg)），待正式 Logo 後更換 |
| OG 預設圖 1200×630 | 尚未提供，`src/data/site.json` 的 `ogImage` 先指向 `/og-default.jpg`（尚未存在） |
| 作品集 PDF | 放到 `public/downloads/studio-hikari-portfolio.pdf` 即可自動生效 |
| 合作品牌 Logo | `src/pages/about.astro` 與 `src/pages/en/about.astro` 裡的 `brands` 陣列目前是空的，有素材後填入即會自動顯示品牌牆 |
| 聯絡頁靜態地圖圖片 | 目前只有「在 Google 地圖上開啟」連結，尚未放實際地圖截圖（見 `contact.astro` 內的 TODO 註解） |
| 字體自架 woff2 | 目前用 Google Fonts CDN 過渡，尚未自架 subset woff2（見 `BaseLayout.astro` 內的 TODO 註解） |

## 尚未完成的階段（見開發規格 §13 的 8 階段路線圖）

目前已完成到第 6 階段（骨架、內容模型、過濾器、作品內頁/Lightbox、首頁輪播與靜態頁、雙語、影片區塊）。**第 7 階段（CMS + GitHub Actions + `.htaccess`）已備好設定檔，但需要你本人建立 GitHub 儲存庫與 Cloudflare Worker 才能真正啟用。第 8 階段（Lighthouse 效能與無障礙檢查）尚未執行**，建議部署上線前跑一次。
