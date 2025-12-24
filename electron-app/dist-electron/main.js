import { app as r, BrowserWindow as d, ipcMain as w } from "electron";
import { fileURLToPath as I } from "node:url";
import a, { dirname as v } from "node:path";
import { activeWindow as T } from "active-win";
import D from "screenshot-desktop";
import { Jimp as S, JimpMime as E } from "jimp";
async function _() {
  try {
    return await T();
  } catch (e) {
    return console.error("Error getting active window:", e), null;
  }
}
async function y() {
  try {
    const e = await D({ format: "png" }), o = await S.read(e);
    return o.blur(20), await o.getBuffer(E.png);
  } catch (e) {
    return console.error("Error capturing screen:", e), null;
  }
}
const R = I(import.meta.url), m = v(R);
process.env.DIST = a.join(m, "../dist");
process.env.VITE_PUBLIC = r.isPackaged ? process.env.DIST : a.join(process.env.DIST, "../public");
let n;
const l = process.env.VITE_DEV_SERVER_URL;
function u() {
  n = new d({
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
  }), l ? n.loadURL(l) : n.loadFile(a.join(process.env.DIST, "index.html"));
}
r.on("window-all-closed", () => {
  process.platform !== "darwin" && r.quit();
});
r.on("activate", () => {
  d.getAllWindows().length === 0 && u();
});
r.whenReady().then(u);
let t = null, s = Date.now();
w.handle("start-tracking", async (e, { projectId: o, userId: p }) => {
  console.log("Tracking started for:", o), t && clearInterval(t), s = Date.now();
  const f = 600 * 1e3;
  return t = setInterval(async () => {
    const c = Date.now(), g = Math.min(100, Math.floor(Math.random() * 100)), i = await _(), h = await y();
    n?.webContents.send("capture-ready", {
      activityPercentage: g,
      windowTitle: i?.title || "Unknown",
      appName: i?.owner?.name || "Unknown",
      url: i?.url || "",
      screenshotBuffer: h,
      startTime: new Date(s).toISOString(),
      endTime: new Date(c).toISOString()
    }), s = c;
  }, f), { status: "active", startTime: /* @__PURE__ */ new Date() };
});
w.handle("stop-tracking", async (e) => (console.log("Tracking stopped"), t && (clearInterval(t), t = null), { status: "idle", endTime: /* @__PURE__ */ new Date() }));
