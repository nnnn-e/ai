
# 对话界面改为左右布局

## 概述
将当前的单栏对话界面改为左右分栏布局：
- **左侧**：对话区域（聊天消息 + 输入框 + 麦克风按钮）
- **右侧**：简历实时预览（随对话更新）

## 布局设计

```text
+------------------------------------------+
|              顶部标题栏                    |
+------------------------------------------+
|                |                          |
|    对话区域     |     简历实时预览           |
|   (约 50%)     |      (约 50%)            |
|                |                          |
|  [聊天消息]     |   [姓名、职位]             |
|  [输入框]       |   [联系方式]              |
|  [麦克风]       |   [工作经历]              |
|                |   [教育背景]              |
|                |   [技能]                  |
+------------------------------------------+
```

## 实施步骤

### 第1步：创建内嵌简历预览组件
创建 `src/components/ResumePanel.tsx`：
- 复用 `ResumePreview` 的内容展示逻辑
- 移除全屏页面样式，改为适配侧边栏
- 简历为空时显示占位提示（如"对话完成后将生成简历"）
- 添加导出 PDF 按钮

### 第2步：修改 Index.tsx 布局
使用 `ResizablePanelGroup` 实现可调整的左右分栏：
- 左侧面板（50%）：保留现有的对话界面组件
- 右侧面板（50%）：嵌入新的 `ResumePanel` 组件
- 可拖拽的分隔条便于调整比例

### 第3步：移动端适配
- 小屏幕（< 768px）时改为上下布局或隐藏简历面板
- 添加切换按钮让用户在移动端手动查看简历

## 组件结构

```text
Index.tsx
├── Header（标题 + 进度条）
└── ResizablePanelGroup
    ├── ResizablePanel（左侧对话）
    │   ├── ChatMessages
    │   ├── ChatInput
    │   └── MicrophoneButton
    ├── ResizableHandle
    └── ResizablePanel（右侧简历）
        └── ResumePanel
```

## 技术细节

### 依赖
- 项目已安装 `react-resizable-panels`
- 已有 `ResizablePanelGroup`、`ResizablePanel`、`ResizableHandle` 组件

### ResumePanel 组件设计
```typescript
interface ResumePanelProps {
  resume: ResumeData | null;
  onExport: () => void;
}
```

### 移动端响应式
使用 `use-mobile` hook 检测屏幕尺寸，小屏时：
- 默认只显示对话区域
- 提供悬浮按钮切换到简历视图
