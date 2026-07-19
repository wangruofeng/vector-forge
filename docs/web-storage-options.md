# Web 数据轻量持久化方案

> 收录于 2026-07-19 ｜ 背景：Vector Forge 当前用 `localStorage` 存文档 + 50 条历史快照，存在 review #10 性能问题（每次 commit 全量序列化）。本文整理除 localStorage 外的可选方案。

## 一、同域本地存储（无后端）

### 1. localStorage / sessionStorage（现状）
- **容量**：5–10 MB（同源所有 key 共享）
- **形态**：同步 API，只能存字符串
- **特点**：`sessionStorage` 会话结束即清；localStorage 永久
- **痛点**：**同步阻塞主线程**；无法存 Blob；`JSON.stringify` 大对象慢（正是 review #10 提到的）

### 2. IndexedDB ⭐ 最重要的升级路径
- **容量**：通常是 localStorage 的 50–1000 倍，可占磁盘 50%+（按磁盘剩余动态分配）
- **形态**：**异步**、事务性、NoSQL 对象仓库
- **能存**：JS 对象（结构化克隆）、Blob、ArrayBuffer、File
- **API**：原生 API 偏繁琐（请求式 + 事件），需自行封装

**对 Vector Forge 的意义**：
```js
// 可以存这些 localStorage 存不下的东西
idb.put('documents', {
  id: 'doc-1',
  svgMarkup,                    // 大 SVG 不再是问题
  history: [...50 个快照],       // 完整历史（解决 review #10）
  thumbnailBlob,                // 缩略图（Blob 直存，不 base64）
  lastModified,
})
```
- 把历史从 localStorage 迁到 IndexedDB，写起来不再同步卡顿
- 多文档管理（未来如果要支持「我的作品列表」）几乎只能选 IndexedDB

**零依赖使用骨架**（不引 idb-keyval 等库，符合 AGENTS.md 红线）：
```js
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('vector-forge', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('documents', { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function save(doc) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite')
    tx.objectStore('documents').put(doc)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}
```

**何时选它**：存的对象 > 100 KB、要存 Blob/File、要事务、要查询索引、要多文档。

### 3. Cache Storage（Service Worker Cache API）
- **初衷**：缓存 HTTP 请求/响应（PWA 离线资源）
- **也能存**：任意 `Response` 对象（body 可以是任意文本/Blob）
- **不适合**：频繁读写的业务数据（没有事务、键值查询不友好）
- **适合 Vector Forge 的场景**：缓存**导入过的 SVG 原始文件**或**导出的结果**，配合 SW 做离线可用

```js
const cache = await caches.open('vector-forge-v1')
await cache.put('/user-doc/abc', new Response(svgMarkup, {
  headers: { 'Content-Type': 'image/svg+xml' }
}))
```

### 4. OPFS（Origin Private File System）⭐⭐ 新方案
- **本质**：**同源的私有文件系统**，可读写真实文件（File/Directory）
- **优势**：接近原生文件 IO，**同步 API 可用（在 Worker 中）**，性能极佳
- **容量**：同 IndexedDB 配额（很大）
- **API**：`navigator.storage.getDirectory()` → `getFileHandle()` → `createWritable()`

**对 Vector Forge 的意义**：
- 存**大体积 SVG 工作区**、**自动保存的草稿文件**、**导出历史**
- 用户可把它当「虚拟 U 盘」：导入/导出真实文件，而不是塞在 JSON 里

```js
const root = await navigator.storage.getDirectory()
const draftsDir = await root.getDirectoryHandle('drafts', { create: true })
const fileHandle = await draftsDir.getFileHandle('autosave.svg', { create: true })
const writable = await fileHandle.createWritable()
await writable.write(svgMarkup)
await writable.close()
```

**何时选它**：真正需要「文件」概念、追求 IO 性能、要存 GB 级数据。

### 5. File System Access API
- **本质**：让用户**显式授权访问本地文件**（Chrome/Edge 支持，Safari 部分支持）
- **不是「持久化」**——是把数据落到用户文件系统，但可保留 `FileSystemFileHandle` 到 IndexedDB，下次直接重打开（不用重新选文件）
- **对 Vector Forge**：可做「**另存为 / 自动保存到本地文件**」这种桌面级体验

### 6. Web SQL Database ❌
- **已废弃**，不要选（只有旧 Chrome/Safari 支持，标准已死）

### 7. Cookie ❌
- 只有 4 KB、每次请求都带、给服务端用的。不适合客户端持久化。

---

## 二、需要后端的轻量方案（跨设备同步 / 分享 / 协作）

如果未来想支持「跨设备同步 / 分享 / 协作」：

| 方案 | 自建成本 | 适配性 |
|------|---------|--------|
| **Cloudflare KV / D1**（与 Pages 同生态）| 低 | 免费额度大，适配 Cloudflare 部署 |
| **Supabase**（Postgres + 实时订阅）| 零 | 功能全，可做协作 |
| **Cloudflare Durable Objects** | 中 | 强一致协作编辑 |
| **GitHub Gist API** | 零 | 把 SVG 存成 Gist，免费、可分享 |

> 当前已有分享功能（copy.shareCopied / shareFailed），如果未来要做分享链接，**Cloudflare KV** 是最契合现有部署的选择。

---

## 三、对 Vector Forge 的具体建议

基于项目现状（零依赖、Cloudflare Pages、文档 + 历史最大 50 条）：

| 场景 | 现状 | 建议 |
|------|------|------|
| **当前文档 + 历史** | localStorage（review #10：每次 commit 全量序列化） | **迁移到 IndexedDB**：异步、不阻塞、可存 Blob 缩略图 |
| **小偏好设置**（语言、面板折叠态） | — | **留在 localStorage**（同步快、体积小） |
| **自动保存大草稿** | — | **OPFS**（如果做） |
| **多文档管理 / 作品列表** | — | **IndexedDB**（带索引按 lastModified 排序） |
| **离线可用** | — | **Cache Storage + Service Worker**（缓存静态资源 + 用户文档） |
| **跨设备分享** | 已有 base64 URL 分享（copy.shareCopied） | 大文档走 **Cloudflare KV** 生成短链 |

---

## 四、迁移路径参考

**立即可做的一步**（不需要新依赖）：把 `useEditorDocument.js` 的持久化从 localStorage 切到 IndexedDB，解决 review #10 的性能问题，顺便为「多文档」打地基。代码量约 50 行。

**落地顺序建议**：
1. IndexedDB 迁移（解决 review #10，为未来分享/多文档铺路）
2. Service Worker + Cache Storage（配合已有 manifest.json 就是完整 PWA）
3. OPFS（如果需要真实文件体验）
4. Cloudflare KV（如果需要跨设备分享短链）
