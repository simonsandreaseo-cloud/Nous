import { app as r, BrowserWindow as w, ipcMain as u } from "electron";
import { fileURLToPath as v } from "node:url";
import a, { dirname as T } from "node:path";
import D from "active-win";
import E from "screenshot-desktop";
import l from "jimp";
async function S() {
  try {
    return await D();
  } catch (e) {
    return console.error("Error getting active window:", e), null;
  }
}
async function _() {
  try {
    const e = await E({ format: "png" }), o = await l.read(e);
    return o.blur(20), await o.getBufferAsync(l.MIME_PNG);
  } catch (e) {
    return console.error("Error capturing screen:", e), null;
  }
}
const y = v(import.meta.url), m = T(y);
process.env.DIST = a.join(m, "../dist");
process.env.VITE_PUBLIC = r.isPackaged ? process.env.DIST : a.join(process.env.DIST, "../public");
let n;
const d = process.env.VITE_DEV_SERVER_URL;
function f() {
  n = new w({
    width: 1e3,
    height: 800,
    webPreferences: {
      preload: a.join(m, "preload.mjs"),
      nodeIntegration: !0,
      // For active-win/screenshot-desktop access might need this or use contextBridge
      contextIsolation: !0
    }
  }), n.webContents.on("did-finish-load", () => {
    n?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), d ? n.loadURL(d) : n.loadFile(a.join(process.env.DIST, "index.html"));
}
r.on("window-all-closed", () => {
  process.platform !== "darwin" && r.quit();
});
r.on("activate", () => {
  w.getAllWindows().length === 0 && f();
});
r.whenReady().then(f);
let t = null, s = Date.now();
u.handle("start-tracking", async (e, { projectId: o, userId: p }) => {
  console.log("Tracking started for:", o), t && clearInterval(t), s = Date.now();
  const g = 600 * 1e3;
  return t = setInterval(async () => {
    const c = Date.now(), I = Math.min(100, Math.floor(Math.random() * 100)), i = await S(), h = await _();
    n?.webContents.send("capture-ready", {
      activityPercentage: I,
      windowTitle: i?.title || "Unknown",
      appName: i?.owner?.name || "Unknown",
      url: i?.url || "",
      screenshotBuffer: h,
      startTime: new Date(s).toISOString(),
      endTime: new Date(c).toISOString()
    }), s = c;
  }, g), { status: "active", startTime: /* @__PURE__ */ new Date() };
});
u.handle("stop-tracking", async (e) => (console.log("Tracking stopped"), t && (clearInterval(t), t = null), { status: "idle", endTime: /* @__PURE__ */ new Date() }));
