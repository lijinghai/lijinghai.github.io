<!--
作者: 算个文科生吧
联系方式(WX): RabbitRobot2025
-->

# LTME-02A + Gemini 335 + RTAB-Map 融合建图项目

本项目用于在 ROS 2 Humble 环境下，把 **力策 LTME-02A 2D 激光雷达** 和 **Orbbec Gemini 335 RGB-D 深度相机** 接入 **RTAB-Map**，实现雷达、深度相机、里程计、地图和 RViz 的一键启动。

当前默认方案已经不是单独看雷达，也不是只跑深度相机，而是完整融合：

```text
Gemini335 RGB + Depth + CameraInfo -> rgbd_sync ------> /rgbd_image
/rgbd_image -> rtabmap_odom/rgbd_odometry ------------> /odom
LTME-02A /scan ---------------------------------------> rtabmap
/rgbd_image + /scan + /odom --------------------------> rtabmap -> /map + /mapData + /cloud_map
```

也就是说，RTAB-Map 同时拿到了：

- LTME-02A 雷达扫描 `/scan`
- Gemini335 RGB-D 同步数据 `/rgbd_image`
- 默认由 RGB-D 里程计计算出来的 `/odom`；需要雷达 ICP 里程计时可用 `USE_ICP_ODOM=true` 切换

> 重要：当前链路已经融合运行，但要得到几何上准确的地图，还需要继续精调 `base_link -> laser` 和 `base_link -> camera_link` 外参。

---

## 运行截图

以下截图由当前项目实际启动后在 RViz 中抓取，截图文件位于 `docs/images/`。

### RTAB-Map 融合建图视图

该视图由 `./scripts/start_gemini335_rtabmap.sh` 启动，包含 LTME-02A 雷达扫描、Gemini335 彩色/深度图像、RTAB-Map 点云地图和 2D 栅格地图。

![RTAB-Map 融合建图 RViz 截图](docs/images/rtabmap_fusion_rviz.png)

### 雷达与深度相机外参校准视图

该视图由 `./scripts/start_fusion_calibration.sh` 启动，重点显示 LTME-02A `/scan` 与 Gemini335 `/camera/depth_registered/points`，用于观察雷达扫描线和深度点云是否在同一空间位置上对齐。

![雷达与 Gemini335 外参校准 RViz 截图](docs/images/rtabmap_calibration_rviz.png)

### 2026-06-23 本轮彩色 RTAB-Map 截图

这张图是本轮重新启动当前项目后抓取的 RViz 彩色截图，使用 `rviz/color_rtabmap_screenshot.rviz` 显示 `/map`、`/cloud_map`、`/mapData` 和 TF。注意：当前现场 RGB 画面本身偏灰白，所以点云虽然按 RGB8 彩色显示，视觉上仍然比较浅；这不是单色占据栅格，而是实际 RGB 点云颜色较淡。

![2026-06-23 RTAB-Map 彩色建图截图](docs/images/codex_rtabmap_color.png)

### 2026-06-23 当前 TF 树

这张图根据本轮运行中的 `ros2 run tf2_tools view_frames` 输出整理，当前主链路为 `map -> odom -> base_link`，雷达和 Gemini335 都挂在 `base_link` 下。

![2026-06-23 当前 TF 树](docs/images/tf_tree_current.png)

当前 TF 拓扑：

```text
map
└── odom                    # 动态 TF，约 20 Hz
    └── base_link            # 动态 TF，约 12 Hz
        ├── laser            # 静态 TF，LTME-02A
        └── camera_link      # 静态 TF，Gemini335 安装外参
            └── camera_depth_frame
                ├── camera_color_frame
                │   └── camera_color_optical_frame
                └── camera_depth_optical_frame
```

本轮实测 `view_frames` 日志：`docs/logs/codex_tf_tree_current.log`。

### 2026-06-23 本轮操作记录

本轮重新检查并确认的 RTAB-Map 建图链路：

```text
/scan          LTME-02A 雷达扫描输入
/rgbd_image    Gemini335 RGB + Depth 同步输入
/odom          RGB-D odometry 默认输出；可切换 LiDAR ICP
/map           RTAB-Map 2D OccupancyGrid
/mapData       RTAB-Map 图优化与 MapCloud 数据
/cloud_map     RTAB-Map 彩色点云地图
/tf, /tf_static 当前坐标树
```

本轮保留的关键配置：

| 项目 | 当前值 | 说明 |
|------|--------|------|
| `USE_SCAN` | `true` | RTAB-Map 订阅 `/scan`，雷达参与栅格/障碍物融合 |
| `GRID_SENSOR` / `Grid/Sensor` | `2` | 当前效果最好；尝试 `1` 后 `/cloud_map` 点数明显变少，已恢复为 `2` |
| `Grid/3D` | `true` | 开启 3D 栅格/点云建图 |
| `Grid/FromDepth` | `true` | 使用 RGB-D 深度生成地图 |
| `Grid/RangeMax` | `8.0` | 限制深度/栅格有效距离 |
| `camera_x/y/z` | `0.08 / 0.00 / 0.18` | `base_link -> camera_link` 当前外参 |
| `camera_roll/pitch/yaw` | `0 / 0 / 0` | 当前相机姿态外参 |
| `laser_x/y/z` | `0.00 / 0.00 / 0.10` | `base_link -> laser` 当前外参 |
| 默认里程计 | `rgbd_odometry` | 默认 `/rgbd_image -> /odom`；需要测试雷达 ICP 时加 `USE_ICP_ODOM=true` |

本轮启动命令：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
DISPLAY=:1 \
USE_SCAN=true \
GRID_SENSOR=2 \
RVIZ=true \
RVIZ_CONFIG=/home/share/Desktop/ljh/code/ljh_rtabmap/rviz/color_rtabmap_screenshot.rviz \
bash scripts/start_gemini335_rtabmap.sh
```

日常建图建议直接用：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
DISPLAY=:1 USE_SCAN=true GRID_SENSOR=2 RVIZ=true bash scripts/start_gemini335_rtabmap.sh
```

如果要重新清空数据库测试：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
DISPLAY=:1 CLEAN_DB=true USE_SCAN=true GRID_SENSOR=2 RVIZ=true bash scripts/start_gemini335_rtabmap.sh
```

如果要临时切换成雷达 ICP 里程计测试：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
DISPLAY=:1 USE_SCAN=true USE_ICP_ODOM=true GRID_SENSOR=2 RVIZ=true bash scripts/start_gemini335_rtabmap.sh
```

本轮截图脚本/命令：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
DISPLAY=:1 rviz2 -d rviz/color_rtabmap_screenshot.rviz
xwd -root -silent -out docs/images/codex_rtabmap_color.xwd
# 本轮在本地将 xwd 转成 PNG 后回传为：
# docs/images/codex_rtabmap_color.png
```

本轮 TF 树生成命令：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
export CONDA_PREFIX=/home/share/miniconda3/envs/ros2_humble
export PATH=$CONDA_PREFIX/bin:$PATH
export LD_LIBRARY_PATH=$CONDA_PREFIX/lib:${LD_LIBRARY_PATH:-}
source $CONDA_PREFIX/setup.bash
source install/setup.bash
ros2 run tf2_tools view_frames > docs/logs/codex_tf_tree_current.log 2>&1
```

本轮推荐检查命令：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
source /home/share/miniconda3/envs/ros2_humble/setup.bash
source install/setup.bash
ros2 topic list | sort
ros2 topic echo --once /map --no-arr
ros2 topic echo --once /mapData --no-arr
ros2 topic echo --once /cloud_map --no-arr
ros2 run tf2_ros tf2_echo map base_link
```

本轮结论：`/map`、`/mapData`、`/cloud_map`、`/scan`、`/rgbd_image`、`/odom` 和 `map -> base_link` TF 都能看到，RTAB-Map 主建图链路是通的。`/octomap_grid` 当前仍然基本为空，但这不影响 RTAB-Map 的主地图 `/map`、`/mapData` 和 `/cloud_map`；后续如果专门需要 OctoMap 栅格，再单独针对 octomap server/投影参数调。

---

## 1. 当前硬件与软件状态

| 项目 | 当前状态 |
|------|----------|
| 雷达 | 力策 LTME-02A，默认 IP `192.168.10.160` |
| 深度相机 | Orbbec Gemini 335，已识别，USB3.2 |
| ROS 版本 | ROS 2 Humble，Conda 环境 |
| 工作空间 | `/home/share/Desktop/ljh/code/ljh_rtabmap` |
| 雷达话题 | `/scan`，约 15 Hz |
| 深度相机话题 | `/camera/color/image_raw`、`/camera/depth/image_raw`、`/camera/depth_registered/points` |
| RGB-D 同步话题 | `/rgbd_image` |
| 里程计 | `/odom`，默认由 `rtabmap_odom/rgbd_odometry` 通过 `/rgbd_image` 生成；`USE_ICP_ODOM=true` 时可切换为 `/scan` ICP |
| 地图输出 | `/map`、`/cloud_map` |
| RViz 配置 | `rviz/fusion_debug.rviz`、`rviz/fusion_calibration.rviz` |
| 相机彩色格式 | 默认 `YUYV`，避免 MJPG 解码不稳定 |

正常运行时，`./scripts/check_fusion_status.sh` 应该能看到：

```text
/rgbd_odometry
/ltme_node
/rgbd_sync
/rtabmap
/rviz2_rtabmap

/scan        Publisher count: 1
/odom        Publisher count: 1
/rgbd_image  Publisher count: 1, Subscription count: 1
/map         Publisher count: 1
/cloud_map   Publisher count: 1
/camera/depth_registered/points Publisher count: 1
```

---

## 2. 硬件连接

### 2.1 连接方式

| 设备 | 接口 | 说明 |
|------|------|------|
| LTME-02A 雷达 | 网线 RJ45 | 接电脑以太网口 |
| Gemini 335 | USB 3.0 | 接电脑 USB3.0/USB3.2 口 |
| 电脑以太网口 | 静态 IP | 需要和雷达在同一网段 |

### 2.2 雷达网络

LTME-02A 默认 IP：

```text
192.168.10.160
```

电脑网卡建议设置：

```text
192.168.10.100/24
```

当前脚本默认网卡名：

```text
enp128s31f6
```

如果你的网卡名不同，启动时用 `NET_DEV` 覆盖。

查看网卡：

```bash
ip link show
ip addr
```

手动添加雷达同网段 IP：

```bash
sudo ip addr add 192.168.10.100/24 dev enp128s31f6
```

测试雷达连通：

```bash
ping -c 3 192.168.10.160
```

---

## 3. 环境说明

| 名称 | 路径 / 值 |
|------|-----------|
| 工作空间 | `/home/share/Desktop/ljh/code/ljh_rtabmap` |
| ROS Conda 环境 | `/home/share/miniconda3/envs/ros2_humble` |
| 默认雷达 IP | `192.168.10.160` |
| 默认电脑雷达网段 IP | `192.168.10.100/24` |
| 默认网卡 | `enp128s31f6` |

通常直接运行脚本即可，脚本内部会自动设置：

```bash
CONDA_PREFIX
PATH
LD_LIBRARY_PATH
source $ROS_CONDA_PREFIX/setup.bash
source install/setup.bash
```

如果你要手动进入 ROS 环境：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
export ROS_CONDA_PREFIX=/home/share/miniconda3/envs/ros2_humble
export CONDA_PREFIX=$ROS_CONDA_PREFIX
export PATH=$ROS_CONDA_PREFIX/bin:$PATH
export LD_LIBRARY_PATH=$ROS_CONDA_PREFIX/lib:${LD_LIBRARY_PATH:-}
source $ROS_CONDA_PREFIX/setup.bash
source install/setup.bash
```

建议使用 bash。如果 zsh 下 `source` 报错，先执行：

```bash
bash
```

---

## 4. 项目目录结构

```text
ljh_rtabmap/
├── README.md
├── start_ltme02a.sh                  # 单独启动 LTME-02A 雷达驱动
├── start_ltme_rviz.sh                # 单独启动 LTME-02A 雷达 + RViz
├── config/
│   ├── sensor_extrinsics.yaml        # 当前雷达/相机外参记录
│   └── rtabmap_fusion_notes.yaml     # 融合说明和参数记录
├── docs/images/
│   └── ltme_rviz_preview.png         # 雷达 RViz 截图
├── launch/
│   └── ltme_gemini335_rtabmap.launch.py
├── rviz/
│   ├── fusion_debug.rviz             # 正常建图 RViz 配置
│   ├── fusion_calibration.rviz       # 外参校准 RViz 配置
│   └── ltme_scan.rviz                # 单雷达 RViz 配置
├── scripts/
│   ├── start_gemini335_rtabmap.sh    # 完整融合一键启动
│   ├── start_fusion_calibration.sh   # 外参校准模式启动
│   └── check_fusion_status.sh        # 融合状态检查
├── src/
│   ├── LitraTech/                    # 力策雷达驱动
│   ├── OrbbecSDK_ROS2/               # Gemini335 ROS2 驱动
│   └── rtabmap_ros / rtabmap_*       # RTAB-Map 相关源码包
├── build/
├── install/
└── log/
```

---

## 5. 操作脚本总览

| 脚本 | 用途 | 推荐场景 |
|------|------|----------|
| `./scripts/start_gemini335_rtabmap.sh` | 启动雷达、Gemini335、ICP 里程计、RTAB-Map、RViz | 日常融合建图 |
| `./scripts/start_fusion_calibration.sh` | 启动外参校准视图 | 调雷达和相机位置关系 |
| `./scripts/check_fusion_status.sh` | 检查节点、话题、频率 | 启动后确认是否正常 |
| `./start_ltme02a.sh` | 仅启动 LTME-02A 雷达驱动 | 单独排查雷达 |
| `./start_ltme_rviz.sh` | 启动 LTME-02A 雷达 + 单雷达 RViz | 单独查看雷达扫描 |

---

## 6. 正式融合启动

### 6.1 默认启动

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
./scripts/start_gemini335_rtabmap.sh
```

这个脚本会启动：

| 节点 | 作用 |
|------|------|
| `/ltme_node` | 发布 LTME-02A `/scan` |
| `/camera/camera_container` | Orbbec 组件容器 |
| `/camera/camera` | Gemini335 相机节点 |
| `/base_to_laser_tf` | 发布 `base_link -> laser` 静态 TF |
| `/base_to_camera_tf` | 发布 `base_link -> camera_link` 静态 TF |
| `/rgbd_sync` | 同步 RGB、Depth、CameraInfo，输出 `/rgbd_image` |
| `/rgbd_odometry` | 默认使用 `/rgbd_image` 生成 `/odom`；`USE_ICP_ODOM=true` 时改用 `/icp_odometry` |
| `/rtabmap` | 融合 `/odom`、`/scan`、`/rgbd_image` 建图 |
| `/rviz2_rtabmap` | 打开 RViz 可视化 |

### 6.2 后台运行，不打开 RViz

```bash
RVIZ=false ./scripts/start_gemini335_rtabmap.sh
```

适合 SSH 测试、性能测试、或远端没有图形界面时使用。

### 6.3 正式建图时保留数据库

当前脚本默认 `CLEAN_DB=false`，不会自动清空 `~/.ros/rtabmap.db`。测试时如果想从空地图重新开始，请显式加 `CLEAN_DB=true`。

正式建图想保留历史地图，直接运行默认脚本即可；也可以显式写出：

```bash
CLEAN_DB=false ./scripts/start_gemini335_rtabmap.sh
```

如果要清空数据库重新建图：

```bash
CLEAN_DB=true ./scripts/start_gemini335_rtabmap.sh
```

### 6.4 更换网卡名

如果雷达网线插的网卡不是 `enp128s31f6`：

```bash
NET_DEV=enp3s0 ./scripts/start_gemini335_rtabmap.sh
```

### 6.5 更换雷达 IP

如果雷达 IP 被改过：

```bash
LIDAR_IP=192.168.10.160 ./scripts/start_gemini335_rtabmap.sh
```

### 6.6 手动指定 RViz 配置

正常建图视图：

```bash
RVIZ_CONFIG=/home/share/Desktop/ljh/code/ljh_rtabmap/rviz/fusion_debug.rviz \
./scripts/start_gemini335_rtabmap.sh
```

校准视图：

```bash
RVIZ_CONFIG=/home/share/Desktop/ljh/code/ljh_rtabmap/rviz/fusion_calibration.rviz \
./scripts/start_gemini335_rtabmap.sh
```

---

## 7. 外参校准启动

### 7.1 启动校准模式

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
./scripts/start_fusion_calibration.sh
```

这个脚本本质上还是调用 `start_gemini335_rtabmap.sh`，但默认设置为：

```text
USE_SCAN=true
USE_ICP_ODOM=true
CLEAN_DB=false
RVIZ=true
RVIZ_CONFIG=/home/share/Desktop/ljh/code/ljh_rtabmap/rviz/fusion_calibration.rviz
```

校准视图主要显示：

- `LTME Scan`
- `Gemini Depth Registered Points`
- `Gemini Color Image`
- `Gemini Depth Image`

RTAB 累积地图默认可以关闭，避免历史点云影响你判断外参。

### 7.2 外参变量

单位：平移是米，旋转是弧度。

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LASER_X` | `0.00` | 雷达相对 `base_link` 的 x |
| `LASER_Y` | `0.00` | 雷达相对 `base_link` 的 y |
| `LASER_Z` | `0.10` | 雷达相对 `base_link` 的 z |
| `LASER_ROLL` | `0.0` | 雷达 roll |
| `LASER_PITCH` | `0.0` | 雷达 pitch |
| `LASER_YAW` | `0.0` | 雷达 yaw |
| `CAMERA_X` | `0.08` | 相机相对 `base_link` 的 x |
| `CAMERA_Y` | `0.00` | 相机相对 `base_link` 的 y |
| `CAMERA_Z` | `0.18` | 相机相对 `base_link` 的 z |
| `CAMERA_ROLL` | `0.0` | 相机 roll |
| `CAMERA_PITCH` | `0.0` | 相机 pitch |
| `CAMERA_YAW` | `0.0` | 相机 yaw |

当前默认值只是能跑通系统的粗略值：

```text
base_link -> laser:
  x=0.00, y=0.00, z=0.10, roll=0, pitch=0, yaw=0

base_link -> camera_link:
  x=0.08, y=0.00, z=0.18, roll=0, pitch=0, yaw=0
```

### 7.3 校准示例

先调相机 yaw：

```bash
CAMERA_YAW=0.035 ./scripts/start_fusion_calibration.sh
```

再调相机位置：

```bash
CAMERA_X=0.10 CAMERA_Z=0.21 CAMERA_YAW=0.035 \
./scripts/start_fusion_calibration.sh
```

如果雷达不在底盘中心，再调雷达：

```bash
LASER_X=0.02 LASER_Y=0.00 LASER_Z=0.12 LASER_YAW=0.01 \
CAMERA_X=0.10 CAMERA_Z=0.21 CAMERA_YAW=0.035 \
./scripts/start_fusion_calibration.sh
```

角度换算：

```text
1 degree  = 0.01745 rad
2 degrees = 0.03490 rad
5 degrees = 0.08727 rad
```

### 7.4 校准步骤

1. 把机器人放平，正对一面墙或墙角，距离约 1.5 到 3 米。
2. 运行 `./scripts/start_fusion_calibration.sh`。
3. 在 RViz 里看 `LTME Scan` 和 `Gemini Depth Registered Points`。
4. 先调 `CAMERA_YAW`，让相机点云墙面方向和雷达扫描线方向一致。
5. 再调 `CAMERA_X`、`CAMERA_Y`，让墙面和墙角在俯视图中重合。
6. 再调 `CAMERA_Z`、`CAMERA_PITCH`，让深度点云高度关系合理。
7. 如果雷达安装位置不在 `base_link` 中心，调 `LASER_X/Y/Z/YAW`。
8. 最终值写入 `config/sensor_extrinsics.yaml`，并在正式启动时用同样环境变量启动。

### 7.5 校准合格标准

| 现象 | 说明 |
|------|------|
| 雷达扫描线和相机点云墙面基本重合 | 外参方向和位置基本正确 |
| 墙角没有明显双层 | yaw 和 x/y 较准 |
| 地面点云高度合理 | z 和 pitch 较准 |
| 机器人小幅移动后点云不明显散开 | 外参和里程计稳定 |
| `/map` 边缘不明显变厚 | 建图质量可接受 |

---

## 8. 状态检查脚本

启动后运行：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
./scripts/check_fusion_status.sh
```

它会输出：

1. 当前 ROS 节点
2. 关键 topic 的 publisher/subscriber
3. `/scan` 和 `/odom` 的频率
4. 判断标准提示

正常输出示例：

```text
--- nodes ---
/base_to_camera_tf
/base_to_laser_tf
/camera/camera
/camera/camera_container
/rgbd_odometry
/ltme_node
/rgbd_sync
/rtabmap
/rviz2_rtabmap

--- topic endpoints ---
[/scan]
Type: sensor_msgs/msg/LaserScan
Publisher count: 1
Subscription count: 3

[/odom]
Type: nav_msgs/msg/Odometry
Publisher count: 1

[/rgbd_image]
Type: rtabmap_msgs/msg/RGBDImage
Publisher count: 1
Subscription count: 1

[/map]
Type: nav_msgs/msg/OccupancyGrid
Publisher count: 1

[/cloud_map]
Type: sensor_msgs/msg/PointCloud2
Publisher count: 1

[/camera/depth_registered/points]
Type: sensor_msgs/msg/PointCloud2
Publisher count: 1
```

判断是否正常：

| 检查项 | 正常结果 |
|--------|----------|
| `/rgbd_odometry` | 默认节点存在；`USE_ICP_ODOM=true` 时为 `/icp_odometry` |
| `/scan` | 1 个 publisher，约 15 Hz |
| `/odom` | 1 个 publisher，约 15 Hz |
| `/rgbd_image` | 1 个 publisher，1 个 subscriber |
| `/map` | 1 个 publisher |
| `/cloud_map` | 1 个 publisher |
| `/camera/depth_registered/points` | 1 个 publisher |

`/odom` 的 `Subscription count: 0` 不一定是错。RTAB-Map 可以通过 TF 使用 odom，不一定表现为订阅 `/odom` topic。

---

## 9. 单独调试雷达

### 9.1 仅启动 LTME-02A 雷达驱动

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
./start_ltme02a.sh
```

这个脚本会：

1. 检查网卡 `enp128s31f6`
2. 尝试给网卡添加 `192.168.10.100/24`
3. ping 雷达 `192.168.10.160`
4. 启动 `ros2 launch ltme_node ltme-02a.launch.py`

验证雷达：

```bash
ros2 topic info /scan
ros2 topic hz /scan
ros2 topic echo /scan --once
```

正常频率约 15 Hz。

### 9.2 启动 LTME-02A + 单雷达 RViz

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
./start_ltme_rviz.sh
```

这个脚本会：

1. 配置雷达网卡
2. 启动或复用 `ltme_node`
3. 打开 `rviz/ltme_scan.rviz`

雷达 RViz 截图：

![LTME-02A 雷达 RViz 效果](docs/images/ltme_rviz_preview.png)

---

## 10. 单独调试 Gemini335 相机

列出设备：

```bash
ros2 run orbbec_camera list_devices_node
```

正常可看到类似：

```text
name: Orbbec Gemini 335
serial: CP0BB530002F
connection: USB3.2
firmware version: 1.4.60
```

检查相机话题：

```bash
ros2 topic info /camera/color/image_raw
ros2 topic info /camera/depth/image_raw
ros2 topic info /camera/depth_registered/points
ros2 topic hz /camera/color/image_raw
ros2 topic hz /camera/depth/image_raw
```

本项目默认在融合 launch 中使用：

```text
color_width: 640
color_height: 480
color_fps: 15
color_format: YUYV

depth_width: 640
depth_height: 480
depth_fps: 15
depth_format: 自动
```

为什么使用 `YUYV`：

- 之前 `ANY` 会自动选择 `MJPG`
- 日志中出现过 `color frame is not decoded`
- 改为 `YUYV` 后测试显示彩色帧可正常发布

如果某台设备不支持 YUYV，可以临时切回：

```bash
COLOR_FORMAT=ANY ./scripts/start_gemini335_rtabmap.sh
```

或：

```bash
COLOR_FORMAT=MJPG ./scripts/start_gemini335_rtabmap.sh
```

---

## 11. RViz 显示说明

### 11.1 正常建图视图

配置文件：

```text
rviz/fusion_debug.rviz
```

主要显示项：

| 显示项 | 话题 | 说明 |
|--------|------|------|
| `Grid` | - | 地面参考网格 |
| `TF` | `/tf`、`/tf_static` | 默认可关闭，调试 TF 时打开 |
| `LTME Scan` | `/scan` | 雷达扫描 |
| `Gemini Depth Registered Points` | `/camera/depth_registered/points` | Gemini 深度点云 |
| `Gemini Color Image` | `/camera/color/image_raw` | 彩色图像 |
| `Gemini Depth Image` | `/camera/depth/image_raw` | 深度图像 |
| `RTAB Cloud Map` | `/cloud_map` | RTAB-Map 3D 点云地图 |
| `RTAB Map` | `/map` | 2D 占据栅格地图 |

如果画面太乱：

- 暂时关闭 `RTAB Cloud Map`
- 只看 `LTME Scan` 和 `Gemini Depth Registered Points`
- 或关闭 `Gemini Depth Registered Points`，只看 `RTAB Map` 和 `LTME Scan`

### 11.2 外参校准视图

配置文件：

```text
rviz/fusion_calibration.rviz
```

主要用于看：

- 雷达 `/scan`
- 相机注册点云 `/camera/depth_registered/points`
- 彩色图 `/camera/color/image_raw`
- 深度图 `/camera/depth/image_raw`

校准时不要被 RTAB 历史地图干扰，重点看雷达线和相机点云的空间重合。

---

## 12. Launch 文件说明

主 launch 文件：

```text
launch/ltme_gemini335_rtabmap.launch.py
```

它负责启动：

| 节点 | package/executable | 说明 |
|------|--------------------|------|
| `ltme_node` | `ltme_node/ltme_node` | LTME-02A 雷达 |
| Orbbec include launch | `orbbec_camera/gemini_330_series.launch.py` | Gemini335 相机 |
| `base_to_laser_tf` | `tf2_ros/static_transform_publisher` | `base_link -> laser` |
| `base_to_camera_tf` | `tf2_ros/static_transform_publisher` | `base_link -> camera_link` |
| `rgbd_sync` | `rtabmap_sync/rgbd_sync` | RGB-D 同步 |
| `rgbd_odometry` | `rtabmap_odom/rgbd_odometry` | 默认 RGB-D 里程计，输出 `/odom` |
| `icp_odometry` | `rtabmap_odom/icp_odometry` | 可选雷达 ICP 里程计，需 `USE_ICP_ODOM=true` |
| `rtabmap` | `rtabmap_slam/rtabmap` | 融合建图 |
| `rviz2_rtabmap` | `rviz2/rviz2` | 可视化 |

关键 RTAB-Map 参数：

```text
frame_id: base_link
map_frame_id: map
odom_frame_id: odom
subscribe_rgbd: true
subscribe_scan: true
approx_sync: true
approx_sync_max_interval: 0.05
delete_db_on_start: CLEAN_DB
Rtabmap/DetectionRate: 2.0
Grid/FromDepth: true
Grid/Sensor: 2
```

关键 ICP odometry 参数：

```text
frame_id: base_link
odom_frame_id: odom
publish_tf: true
subscribe_scan: true
Icp/MaxCorrespondenceDistance: 0.30
Icp/CorrespondenceRatio: 0.10
Icp/Iterations: 15
Icp/VoxelSize: 0.05
```

---

## 13. 启动脚本参数表

`./scripts/start_gemini335_rtabmap.sh` 支持这些环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WS` | `/home/share/Desktop/ljh/code/ljh_rtabmap` | 工作空间路径 |
| `ROS_CONDA_PREFIX` | `/home/share/miniconda3/envs/ros2_humble` | ROS Conda 环境 |
| `NET_DEV` | `enp128s31f6` | 雷达网卡名 |
| `HOST_IP_CIDR` | `192.168.10.100/24` | 电脑雷达网段 IP |
| `LIDAR_IP` | `192.168.10.160` | 雷达 IP |
| `RVIZ` | `true` | 是否打开 RViz |
| `RVIZ_CONFIG` | `$WS/rviz/fusion_debug.rviz` | RViz 配置文件 |
| `USE_SCAN` | `true` | RTAB-Map 是否订阅 `/scan` |
| `USE_ICP_ODOM` | `true` | 是否使用雷达 ICP 里程计 |
| `CLEAN_DB` | `false` | 启动时是否清空 RTAB-Map 数据库；测试重建图时可设为 `true` |
| `COLOR_FORMAT` | `YUYV` | Gemini 彩色图格式 |
| `COLOR_FPS` | `15` | Gemini 彩色帧率 |
| `DEPTH_FPS` | `15` | Gemini 深度帧率 |
| `LASER_X/Y/Z` | `0/0/0.10` | 雷达平移外参 |
| `LASER_ROLL/PITCH/YAW` | `0/0/0` | 雷达旋转外参 |
| `CAMERA_X/Y/Z` | `0.08/0/0.18` | 相机平移外参 |
| `CAMERA_ROLL/PITCH/YAW` | `0/0/0` | 相机旋转外参 |

组合示例：

```bash
NET_DEV=enp3s0 \
CLEAN_DB=false \
CAMERA_X=0.10 CAMERA_Z=0.21 CAMERA_YAW=0.035 \
./scripts/start_gemini335_rtabmap.sh
```

---

## 14. 常见问题与处理

### 14.1 雷达 ping 不通

检查：

```bash
ip addr
ip link show
ping -c 3 192.168.10.160
```

处理：

- 检查雷达供电
- 检查网线
- 检查电脑网卡是否有 `192.168.10.100/24`
- 检查 `NET_DEV` 是否是正确网卡

### 14.2 `/scan` 没有数据

检查：

```bash
ros2 topic info /scan
ros2 topic hz /scan
```

如果没有 publisher，单独启动雷达：

```bash
./start_ltme02a.sh
```

### 14.3 看不到相机图像

检查：

```bash
ros2 topic info /camera/color/image_raw
ros2 topic info /camera/depth/image_raw
ros2 topic hz /camera/color/image_raw
ros2 topic hz /camera/depth/image_raw
```

RViz 中确认这些显示项被勾选：

- `Gemini Color Image`
- `Gemini Depth Image`
- `Gemini Depth Registered Points`

如果日志出现：

```text
color frame is not decoded
Failed to convert frame
```

确认启动日志里是：

```text
Gemini335 color_format: YUYV
color Frame - Width: 640 Height: 480 fps: 15 Format: YUYV
```

如果不是，重新启动：

```bash
COLOR_FORMAT=YUYV ./scripts/start_gemini335_rtabmap.sh
```

### 14.4 `/odom` 一开始提示未发布

`ros2 topic hz /odom` 刚开始可能显示：

```text
WARNING: topic [/odom] does not appear to be published yet
```

只要后面出现：

```text
average rate: 15.x
```

就是正常的。

### 14.5 地图能出来但很乱

先不要乱改 RTAB-Map 参数，优先检查外参。

重点调：

```text
CAMERA_YAW
CAMERA_X
CAMERA_Y
CAMERA_Z
LASER_X
LASER_Y
LASER_YAW
```

用校准模式：

```bash
./scripts/start_fusion_calibration.sh
```

### 14.6 RViz 很卡

处理：

- 关闭 `Gemini Depth Registered Points`
- 关闭 `RTAB Cloud Map`
- 保留 `RTAB Map` 和 `LTME Scan`
- 后台运行：

```bash
RVIZ=false ./scripts/start_gemini335_rtabmap.sh
```

### 14.7 SSH 里启动 RViz 报 display 错误

如果你通过 SSH 启动，可能看到：

```text
qt.qpa.xcb: could not connect to display :0
```

这说明当前 SSH 会话没有图形权限，不代表传感器失败。可以：

```bash
RVIZ=false ./scripts/start_gemini335_rtabmap.sh
```

然后在本机图形终端里打开 RViz，或直接在服务器桌面终端运行启动脚本。

### 14.8 `libcurl.so.4: no version information available`

这是 Conda 环境库版本提示，目前不影响节点运行。只要 topic 正常发布，可以忽略。

### 14.9 看到 `rgbd_odometry quality=0`

当前默认使用 `rgbd_odometry` 由 `/rgbd_image` 生成 `/odom`。如果看到 `quality=0`，通常说明 RGB-D 特征不足、画面纹理太少、深度/RGB 时间同步差，或者相机被遮挡/过近。

先确认这些话题都正常：

```bash
ros2 topic hz /rgbd_image
ros2 topic echo --once /odom --no-arr
ros2 topic echo --once /camera/color/camera_info --no-arr
ros2 topic echo --once /camera/depth/image_raw --no-arr
```

如果要临时绕开 RGB-D 里程计，用雷达 ICP 里程计测试：

```bash
USE_SCAN=true USE_ICP_ODOM=true GRID_SENSOR=2 ./scripts/start_gemini335_rtabmap.sh
```

主脚本启动前会清理旧进程，建议排查时直接重新启动主脚本。

---

## 15. 推荐工作流程

### 15.1 第一次上电检查

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
ping -c 3 192.168.10.160
ros2 run orbbec_camera list_devices_node
```

### 15.2 启动融合

```bash
./scripts/start_gemini335_rtabmap.sh
```

### 15.3 检查状态

新开一个终端：

```bash
cd /home/share/Desktop/ljh/code/ljh_rtabmap
./scripts/check_fusion_status.sh
```

### 15.4 校准外参

```bash
./scripts/start_fusion_calibration.sh
```

逐步尝试：

```bash
CAMERA_YAW=0.035 ./scripts/start_fusion_calibration.sh
```

### 15.5 正式建图

外参基本正确后：

```bash
CLEAN_DB=false ./scripts/start_gemini335_rtabmap.sh
```

移动建议：

- 慢速平移
- 慢速转弯
- 不要快速原地旋转
- 优先沿墙、门框、桌腿等几何特征移动
- 少在空旷白墙区域快速移动

---

## 16. 已验证结果

当前已验证：

```text
/scan                           发布正常，约 15 Hz
/odom                           发布正常，约 15 Hz
/camera/color/image_raw          发布正常
/camera/depth/image_raw          发布正常
/camera/depth_registered/points  发布正常
/rgbd_image                      发布正常
/map                             发布正常
/cloud_map                       发布正常
```

Gemini335 当前推荐运行格式：

```text
color Frame: 640x480 fps 15 Format YUYV
depth Frame: 640x480 fps 15 Format Y16
```

RTAB-Map 当前是 SLAM 模式，输出：

```text
/map
/cloud_map
map -> odom TF
```

---

## 17. 参考资料

| 资源 | 地址 |
|------|------|
| OrbbecSDK_ROS2 | https://github.com/orbbec/OrbbecSDK_ROS2 |
| RTAB-Map ROS | https://github.com/introlab/rtabmap_ros |
| RTAB-Map | https://github.com/introlab/rtabmap |
| ROS 2 sensor_msgs/LaserScan | https://docs.ros2.org/latest/api/sensor_msgs/msg/LaserScan.html |
| 本地雷达资料 | `LTME-02A开发资料20230331` |
