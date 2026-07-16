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
- 全屏编辑模式，2D / 3D 预览切换

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

项目核心逻辑集中在单文件 `src/main.jsx`（约 1000 行，包含全部组件与 SVG 操作工具函数），样式在 `src/styles.css`。

```text
.
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx     # 应用入口 + 全部 UI 组件与 SVG 编辑逻辑
│   └── styles.css   # 全局样式
├── index.html
└── package.json
```

## License

本项目基于 [MIT License](./LICENSE) 开源。
