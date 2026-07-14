# Vector Forge

Vector Forge 是一个运行在浏览器中的 SVG 编辑器，支持拖入 SVG 文件后实时查看、选择和调整内部图层。

[在线体验](https://vector-forge-5hx.pages.dev/) · [GitHub 仓库](https://github.com/wangruofeng/vector-forge)

## 功能

- 拖拽或选择 SVG 文件导入
- 左侧图层树查看 SVG 内部元素
- 点击预览图中的元素，自动选中对应图层
- 图层显示 / 隐藏
- 拖拽 SVG 图片调整画布位置
- 双指捏合、触控板或鼠标滚轮缩放 SVG 图片
- 实时编辑填充色、描边色、透明度和描边宽度
- Preview / Source 预览与源码视图
- 导出编辑后的 SVG
- 简体中文 / English 双语界面

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

```text
.
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx
│   └── styles.css
├── index.html
└── package.json
```

## License

本项目基于 [MIT License](./LICENSE) 开源。
