# Vector Forge 浏览器冒烟清单

用于每次架构重构 checkpoint 的本地回归验证。启动 `npm run dev` 后，在浏览器访问 `http://127.0.0.1:5173/`。

## 基础加载

- [ ] 页面标题为 `Vector Forge — SVG editor`。
- [ ] 首屏出现 VECTOR FORGE、Layers、Preview、Inspector 和示例 SVG。
- [ ] 页面没有 Vite/React 错误覆盖层，控制台没有 error/warn。

## 图层与画布

- [ ] 点击图层行后，预览区域出现对应选框，Inspector 内容同步。
- [ ] 按 Cmd/Ctrl 点击第二个图层后，两个图层行均保持 selected，预览显示两个独立选框及多选组外框。
- [ ] 在预览中点击已选图层不会把多选折回单选。
- [ ] 拖动已选图层后，SVG 内容更新且可用 Undo 恢复。
- [ ] Preview / Source 切换正常，源码编辑区可以显示 SVG。

## 编辑与导出

- [ ] 修改填充色或透明度后，预览即时更新，Undo / Redo 正常。
- [ ] 点击 Export SVG 后导出弹窗打开，关闭按钮正常。
- [ ] Cmd/Ctrl+A、Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z 快捷键正常。

## 响应式

- [ ] 375×800 视口下页面不出现横向滚动，预览和 Inspector 可见。
- [ ] 小屏下图层面板按设计隐藏，顶部导入/导出操作仍可用。

## 记录

每次重构 checkpoint 至少执行：

```bash
npm run build
```

并在浏览器完成上述清单。若某项失败，先回退当前 checkpoint，再继续拆分。
