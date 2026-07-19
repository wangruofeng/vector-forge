# CLAUDE.md — Vector Forge

浏览器端 SVG 编辑器。React + Vite 单页应用，部署到 Cloudflare Pages。

## 架构要点

- **模块化单页架构**：`src/main.jsx` 负责应用编排和跨模块行为组合；纯 SVG 逻辑位于 `src/editor/`，文案位于 `src/app/copy.js`，面板位于 `src/components/`，文档与画布状态分别位于 `src/hooks/`。保持模块边界清晰，避免把新的业务逻辑重新堆回入口文件。
- **不可变字符串驱动的 SVG 编辑**：SVG 内容始终以原始 markup 字符串形式存在 state（`svgMarkup`），所有编辑操作（改属性、增删图层、排序、变换）都是「解析字符串 → 用 DOM API 修改 → 序列化回字符串 → `commitDocument`」。不要引入直接操作 DOM 节点的副作用。
- **历史记录**：`commitDocument` 是唯一的变更入口，自动 push 快照到 `history.past`。撤销/重做在快照间移动。新增任何会改变 SVG 的操作，必须走 `commitDocument`，否则历史会断。
- **i18n**：所有界面文案在 `src/app/copy.js` 的 `COPY` 对象（`en` / `zh` 两份），通过 `language` state 切换。新增文案必须同时补两语言，禁止硬编码中英文到 JSX 里。

## 开发命令

```bash
npm install
npm run dev      # 本地开发，默认 http://localhost:5173
npm run build    # 产物输出到 dist/
npm run preview  # 预览构建产物
```

## 部署

Cloudflare Pages Direct Upload（项目内无 CI 配置，手动部署）：

```bash
npm run build
npx wrangler pages deploy dist --project-name vector-forge --branch main
```

## 红线

- **不要引入新依赖**：项目零运行时依赖（React/Vite 之外），SVG 操作全靠原生 DOM API。新增功能优先用浏览器原生能力。
- **不要硬编码界面文案**：一律走 `COPY` 双语对象。
- **任何 SVG 变更必须经 `commitDocument`**：否则撤销/重做会失同步。

## 项目状态

- 版本 `0.1.0`，仍在功能迭代中（近期：内联文字编辑、2D 画布多选预览、模块化重构）。
- 在线 demo：<https://vector-forge.wangruofeng007.com/>
