# lijinghai.github.io

Jinghai Li 的个人主页，保留原有白色横线纸背景、蓝橙配色、人物照片、研究卡片和大图项目列表，用真实机器人项目说明从 AMR 工程到 VLN / VLA 研究的连续路径。

## 最近更新

### 2026-08-17 - Go2X 机器狗项目改写

本次只修改主页 `Selected Work` 中的第一张机器狗卡片，以及对应的机器狗详情页。页面延续原有白底、蓝橙链接和渐变标题风格，内容从“平台接入准备”更新为有代码、实机画面和测量数据支撑的工程记录；其他项目卡片与详情页不变。

```mermaid
flowchart LR
  CAMERA["Gemini 335<br/>1280x720 RGB-D"] --> ROS["ROS 2 Jazzy<br/>robot_gmini335"]
  ROS --> RELAY["640x360 RGB-D relay<br/>RGB 10 Hz / Depth 5 Hz"]
  RELAY --> BRIDGE["rosbridge<br/>WebSocket 9090"]
  BRIDGE --> MODEL["MiniCPM Shadow<br/>31-frame history"]
  MODEL --> TRAJ["8-point trajectory"]
  TRAJ -. "dry-run / armed=false" .-> MOTION["Go2X motion bridge"]
```

| 内容 | 实际改动与证据 |
| --- | --- |
| 首页第一卡片 | 写明 Unitree Go2X、ROS 2 Jazzy、Gemini 335 与 MiniCPM Shadow；展示 1280×720@30 RGB-D 和 140 次 Shadow 推理结果 |
| 详情页 | 增加完整数据架构、RGB / 深度实机帧、跨机中继、代码职责、六项技术难点、安全边界和招聘者 / 导师视角的能力说明 |
| 真实结果 | RGB / 对齐深度 29.970 / 29.962 Hz；18 秒 140 次推理；8 点轨迹；0 模型错误、0 传感器故障 |
| 安全边界 | 明确 Shadow、dry-run、`armed=false`，没有把尚未完成的实机自主跟随或长程 VLN 恢复写成既成结果 |
| 新增素材 | Gemini 335 RGB、对齐深度、MiniCPM 中继帧，以及桌面 / 手机端页面实测截图 |
| 关键文件 | `index.html`、`RabbitRobot/projects/rabbitrobot-robotdog-vln.html`、`RabbitRobot/images/rabbitrobot/go2x_*` |
| 页面验证 | 桌面端与 390×844 手机端均无横向溢出、坏图或浏览器警告；所有本地引用存在 |

首页第一张机器狗卡片：

![首页机器狗卡片](docs/images/updates/2026-08-17-robotdog-profile/home-card.png)

机器狗详情页桌面端与手机端：

![机器狗详情页桌面端](docs/images/updates/2026-08-17-robotdog-profile/desktop-detail.png)

![机器狗详情页手机端](docs/images/updates/2026-08-17-robotdog-profile/mobile-detail.png)

### 2026-08-17 - 主页内容重写

本次更新只调整主页文字，不改视觉风格、布局、配色、图片和入口结构。重点去掉模板化自述，改为从自建机器人出发，清楚说明长程 VLN 偏航检测、历史状态、语义子目标与可验证恢复这条研究线。

| 内容 | 说明 |
| --- | --- |
| 首页自述 | 写清从底盘、电控、传感器和 ROS 2 / Nav2 工程走向真实机器人 VLN 的个人路径 |
| 研究重点 | 明确长程指令偏航检测、历史状态利用、语义子目标和恢复验证 |
| 项目顺序 | 保持机器狗、RabbitRobot AMR、EDULITE A3、2025 工程档案、AMR2 覆盖规划的原顺序 |
| 项目状态 | 区分已完成的 Gemini 335 RGB-D 链路、工程基线与仍在推进的恢复研究 |
| 关键文件 | `index.html` |
| 验证方式 | `git diff --check`、本地引用检查、桌面与 390×844 手机端浏览器测试 |
| 验证结果 | 19 个本地引用全部存在；两种视口均无横向溢出、坏图或浏览器警告 |

桌面端实际效果：

![主页桌面端效果](docs/images/updates/2026-08-17-homepage-content/desktop.png)

手机端实际效果：

![主页手机端效果](docs/images/updates/2026-08-17-homepage-content/mobile.png)
