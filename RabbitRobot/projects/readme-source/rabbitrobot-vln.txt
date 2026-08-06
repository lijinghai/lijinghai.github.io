# RabbitRobot_VLN

**时间**：2026.07+

**定位**：视觉语言导航主线

## 项目说明

RabbitRobot_VLN 关注真实 AMR 的 Vision-Language Navigation：把自然语言任务、视觉/地图 grounding、waypoint 规划和真车执行评估串成闭环。

## 关键记录

- 把“去门口”“绕开杂物到桌边”等语言任务整理成可复现的实验指令。
- 用 AMR2 的 Nav2、地图、视觉帧和机器人状态承接 VLN 策略输出。
- 评估成功率、碰撞率、路径效率、恢复能力和策略解释性，而不是只看单次演示。

## 技术关键词

VLN, VLM, Embodied Navigation, Waypoint Policy, ROS2, Nav2, rosbag

## 与 VLN 主线的关系

这是当前主线本身：先把传统导航 baseline 跑稳，再把语言目标和真实场景数据逐步接入策略评估。

## 工程痕迹

这个项目页记录的是从结构、线束、驱动、参数到实测反馈逐步收拢出来的系统，而不是只保留最后一张效果图。
