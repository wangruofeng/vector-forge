# Vector Forge

Vector Forge 是一个运行在浏览器中的 SVG 编辑器，支持拖入 SVG 文件后实时查看、选择和调整内部图层。

[在线体验](https://vector-forge.wangruofeng007.com/) · [GitHub 仓库](https://github.com/wangruofeng/vector-forge)

## 功能

### 导入与浏览
- 拖拽或选择 SVG 文件导入
- 左侧图层树查看 SVG 内部元素，分组可展开 / 折叠
- 点击预览图中的元素，自动选中对应图层
- 图层显示 / 隐藏

### 图层编辑
- 添加图层：矩形、圆形、椭圆、直线、折线、多边形、路径、文字
- 复制 / 粘贴 / 删除图层
- 拖拽图层调整上下顺序
- 选中文字图层可在画布上直接编辑文字内容

### 画布操作
- 拖拽 SVG 图片调整画布位置
- 双指捏合、触控板或鼠标滚轮缩放
- 矢量元素支持缩放手柄调整尺寸，矩形可修改圆角半径
- 支持 Cmd/Ctrl 多选图层，并在 2D 预览中显示每个图层和组合边界

### 属性面板
- 实时编辑填充色、描边色、透明度、描边宽度
- 可折叠的属性检查器面板

### 源码与历史
- Preview / Source 视图，源码带语法高亮并可一键格式化
- 修改历史记录，支持撤销 / 前进
- 导出编辑后的 SVG

### 其他
- 简体中文 / English 双语界面

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + Z` | 撤销 |
| `Cmd/Ctrl + Shift + Z` | 重做 |
| `Cmd/Ctrl + C` / `V` | 复制 / 粘贴图层 |
| `Delete` / `Backspace` | 删除选中图层 |

## 技术栈

- React
- Vite
- Cloudflare Pages
- Wrangler

## 本地运行

```bash
npm install
npm run dev
```

启动后访问终端输出的本地地址，通常是 `http://localhost:5173`。

## 构建

```bash
npm run build
npm run preview
```

## 部署到 Cloudflare Pages

项目当前使用 Cloudflare Pages Direct Upload，将 Vite 构建产物上传到 Pages：

```bash
npm run build
npx wrangler pages deploy dist --project-name vector-forge --branch main
```

部署前需要先使用 Wrangler 登录 Cloudflare：

```bash
npx wrangler login
```

## 项目结构

应用入口负责编排，SVG 解析/几何/变换、共享文案、面板组件和状态 Hook 分别按职责拆分；样式仍集中在 `src/styles.css`。

```text
.
├── public/
│   ├── favicon.svg              # SVG favicon
│   ├── apple-touch-icon.png     # iOS 触摸图标 (180×180)
│   ├── icon-192.png             # PWA 图标 (192×192)
│   ├── icon-512.png             # PWA 图标 (512×512)
│   ├── icon-maskable-512.png    # PWA maskable 图标 (512×512)
│   ├── og-image.png             # 社交分享图 (1200×630)
│   ├── manifest.json            # PWA manifest
│   ├── robots.txt               # 爬虫策略（覆盖 Cloudflare 托管默认）
│   ├── sitemap.xml              # 站点地图
│   ├── _headers                 # Cloudflare Pages 缓存策略
│   └── 404.html                 # 静态 404 页（解决 SPA 软 404）
├── src/
│   ├── main.jsx     # 应用入口与业务编排
│   ├── app/copy.js  # 双语文案和显示名称
│   ├── components/  # LayerPanel、CanvasPanel、InspectorPanel、Icon
│   ├── editor/      # SVG parser、geometry、transforms
│   ├── hooks/       # 文档状态和画布交互 Hook
│   └── styles.css   # 全局样式
├── index.html
└── package.json
```

## SEO 与可分享性

`index.html` 内置了完整的 SEO 基础设施，无需后端：

- **静态兜底文案**：`#root` 内手写 H1 + 功能列表，爬虫与禁用 JS 客户端首屏可见；React `createRoot` 渲染时清空替换，不产生 hydration 问题（未用 `hydrateRoot`）。
- **元数据**：title、description、keywords、canonical、Open Graph（含 `og:locale` 双语）、Twitter Card。
- **结构化数据**：`WebApplication` + `WebSite` + `Organization` 三实体 `@graph`，验证用 [Rich Results Test](https://search.google.com/test/rich-results)（会渲染 JS）。
- **PWA**：`manifest.json` + 三种尺寸图标，可在浏览器「安装为应用」。
- **爬虫策略**：`public/robots.txt` 显式允许搜索引擎、封禁 AI 训练 / 检索爬虫（GPTBot、ClaudeBot、CCBot、Google-Extended、PerplexityBot 等）。若希望被 AI 搜索引用，编辑此文件放开对应 User-agent。
- **缓存**：`public/_headers` 把 `/assets/*` 设为 1 年 immutable（带哈希），HTML 走 `must-revalidate`。
- **404**：`public/404.html` 是独立静态页，Cloudflare Pages 对未匹配路由返回它（404 状态）。

## 部署到 Cloudflare Pages 后的验证清单

```bash
# 1. 部署
npm run build
npx wrangler pages deploy dist --project-name vector-forge --branch main

# 2. 验证关键资源（应返回 200 + 正确 content-type）
curl -sI https://vector-forge.wangruofeng007.com/robots.txt
curl -sI https://vector-forge.wangruofeng007.com/sitemap.xml
curl -sI https://vector-forge.wangruofeng007.com/manifest.json
curl -sI https://vector-forge.wangruofeng007.com/og-image.png

# 3. 验证项目 robots.txt 是否覆盖了 Cloudflare 托管默认
curl -s https://vector-forge.wangruofeng007.com/robots.txt | head -5

# 4. 验证未匹配路由返回 404（而非软 404）
curl -sI https://vector-forge.wangruofeng007.com/no-such-page | head -1

# 5. 验证 _headers 是否生效（assets 应为 immutable）
curl -sI https://vector-forge.wangruofeng007.com/assets/ | grep -i cache-control
```

## License

本项目基于 [MIT License](./LICENSE) 开源。
