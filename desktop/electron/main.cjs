const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_RENDERER_URL || "http://localhost:5173";

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "Flashcard English",
    backgroundColor: "#0b1020",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const distIndexPath = path.join(__dirname, "../dist/index.html");
  let fallbackLoaded = false;

  const renderErrorPage = (reason) => {
    const html = `
      <html>
        <body style="margin:0;display:grid;place-items:center;height:100vh;background:#020617;color:#e2e8f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
          <div style="max-width:640px;padding:28px;border:1px solid #334155;border-radius:16px;background:#0f172a;line-height:1.55;">
            <h2 style="margin:0 0 10px;font-size:22px;">Không tải được UI</h2>
            <p style="margin:0 0 10px;color:#94a3b8;">Electron không kết nối được tới Vite dev server (<code>${DEV_URL}</code>).</p>
            <p style="margin:0 0 10px;color:#94a3b8;">Cách xử lý nhanh:</p>
            <ol style="margin:0 0 14px 20px;color:#cbd5e1;">
              <li>Chạy <code>npm run dev</code> trong thư mục <code>desktop</code></li>
              <li>Hoặc build trước bằng <code>npm run build</code> để dùng bản dist</li>
            </ol>
            <div style="font-size:12px;color:#64748b;">Chi tiết lỗi: ${reason}</div>
          </div>
        </body>
      </html>
    `;

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  };

  const loadFallback = (reason = "Unknown") => {
    if (fallbackLoaded) return;
    fallbackLoaded = true;

    if (fs.existsSync(distIndexPath)) {
      win.loadFile(distIndexPath).catch(() => renderErrorPage(reason));
      return;
    }

    renderErrorPage(reason);
  };

  if (isDev) {
    win.loadURL(DEV_URL).catch((err) => loadFallback(String(err?.message || err)));

    win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
      if (validatedURL?.startsWith("data:")) return;
      if (errorCode < 0) {
        loadFallback(`${errorCode} ${errorDescription}`);
      }
    });
  } else {
    loadFallback("packaged-mode");
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
