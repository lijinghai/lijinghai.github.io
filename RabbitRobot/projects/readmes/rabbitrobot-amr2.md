# ljh_amr2_hubwheel_drive

这是 `ljh_amr2` 系列里的轮毂伺服 AMR 真车项目。当前工程不是仿真 demo，而是围绕你的实车链路整理出来的 ROS2 Humble 工作空间：

- Livox MID360 负责激光和 IMU 输入
- Fast-LIO 负责建图、里程计和点云输出
- PCD/PGM 地图分别用于 ICP 定位和 Nav2 map_server
- Nav2 使用 MPPI 局部控制器
- velocity_smoother 负责速度平滑
- collision_monitor 负责最后一层近距离避障保护
- DS20270C 轮毂伺服驱动器负责底盘运动
- `ljh_robot_web` 提供网页控制台和状态查看

## 车辆印象

这台车是小型差速轮毂 AMR，当前导航 footprint 按实测外形配置：

```text
车长: 0.486 m
车宽: 0.450 m
半长: 0.243 m
半宽: 0.225 m
```

底盘是 DS20270C 双轮轮毂伺服差速结构。相比普通小车底盘，它更像一台紧凑的工业调试 AMR：机械上重点是轮毂伺服和 CAN 控制，软件上重点是 ROS2 真车链路、MID360 建图定位、Nav2 导航和网页控制台。

## MPPI 加入后的效果

MPPI 是 Nav2 的模型预测路径积分控制器。放到你这台车上，主要效果是：

1. 行驶会更连续  
   MPPI 会在当前速度约束、车体 footprint、局部 costmap 下采样多条未来轨迹，再选代价最低的一条，不是简单追一个局部点。转弯和贴路径时更容易平顺。

2. 避障更自然  
   MPPI 的 `CostCritic` 会结合局部 costmap 和真实矩形 footprint 计算碰撞代价。前方有障碍时，不只是“突然停”，它会尽量选择代价更低的轨迹。

3. 对轮毂差速底盘更合适  
   当前 `motion_model: DiffDrive`，`vy_max: 0.0`，避免 Nav2 输出横移速度。速度上限也按你的车调成保守档：

```yaml
vx_max: 0.20
vx_min: 0.0
wz_max: 0.60
controller_frequency: 10.0
model_dt: 0.10
time_steps: 24
batch_size: 800
```

4. 仍然保留硬保护  
   MPPI 是规划控制层，collision monitor 是最后保护层。即使 MPPI 或 costmap 没来得及绕开，近距离 stop 区也会把输出速度压成 0。

## 当前主链路

```text
Livox MID360
  -> /livox/lidar, /livox/imu
  -> Fast-LIO
  -> /Odometry, /cloud_registered, /cloud_registered_body
  -> odom -> base_link
  -> pointcloud_to_laserscan
  -> /scan
  -> ICP registration
  -> map -> odom
  -> Nav2 map_server + planner_server + MPPI controller_server
  -> /cmd_vel_nav
  -> velocity_smoother
  -> /cmd_vel_raw
  -> collision_monitor
  -> /cmd_vel_smooth
  -> DS20270C CAN chassis node
```

底盘在导航模式下必须订阅：

```text
/cmd_vel_smooth
```

不要让底盘直接订阅 `/cmd_vel_nav` 或 `/cmd_vel_raw`，否则会绕过平滑和避障保护。

## 当前硬件配置

| 模块 | 当前配置 |
| --- | --- |
| 底盘 | DS20270C 轮毂伺服差速底盘 |
| 车体尺寸 | 0.486 m x 0.450 m |
| Nav2 footprint | `[[0.243, 0.225], [0.243, -0.225], [-0.243, -0.225], [-0.243, 0.225]]` |
| 激光雷达 | Livox MID360 |
| 雷达 IP | `192.168.1.3` |
| 主机雷达网口 | `eth0`, `192.168.1.100/24` |
| 常用 SSH 地址 | `192.168.3.248` |
| ROS 版本 | ROS2 Humble, Ubuntu 22.04 |
| 地图点云 | `ljh20260724.pcd` |
| 2D 地图 | `maps/map.yaml`, `maps/map.pgm` |

## 目录结构

```text
.
├── build.sh
├── setup_mid360_eth.sh
├── mapping.sh
├── save_pcd.sh
├── save_2dmap.sh
├── nav.sh
├── start_chassis_keyboard.sh
├── start_web_gui.sh
├── ljh20260724.pcd
├── maps/
│   ├── map.yaml
│   └── map.pgm
├── ljh_robot_web/
└── src/
    ├── ljh_robot_bringup/
    ├── ljh_robot_ds20270c_can_driver/
    ├── ljh_robot_lidar/
    ├── ljh_robot_lio/FAST_LIO/
    ├── ljh_robot_mapper/
    ├── ljh_robot_navigation2/
    └── ljh_robot_registration/
```

## 编译

```bash
cd /home/sunrise/Desktop/ljh/code/ros2/ljh_amr2_hubwheel_drive
./build.sh
source install/setup.bash
```

只编译导航和点云转激光：

```bash
source /opt/ros/humble/setup.bash
colcon build --symlink-install --packages-select robot_navigation2 pointcloud_to_laserscan
source install/setup.bash
```

## MID360 网络

当前雷达链路要求：

```text
eth0: 192.168.1.100/24
MID360: 192.168.1.3
```

检查：

```bash
./setup_mid360_eth.sh --check
```

自动修复：

```bash
./setup_mid360_eth.sh
```

如果 Livox 启动时报：

```text
bind failed
Failed to init livox lidar sdk
```

优先检查 `eth0` 有没有 `192.168.1.100/24`。

## 建图与保存地图

启动建图：

```bash
./mapping.sh
```

保存 PCD：

```bash
./save_pcd.sh
```

生成 Nav2 2D 地图：

```bash
./save_2dmap.sh
```

当前导航默认使用：

```text
ljh20260724.pcd
maps/map.yaml
maps/map.pgm
```

## 导航启动

正式导航：

```bash
cd /home/sunrise/Desktop/ljh/code/ros2/ljh_amr2_hubwheel_drive
./nav.sh
```

只检查环境和 launch：

```bash
./nav.sh --check
```

安全干跑，不发 CAN：

```bash
./nav.sh --safe-base --duration 45 --no-terminal --no-rviz
```

`nav.sh` 会按顺序启动：

1. Livox MID360 驱动
2. Fast-LIO
3. DS20270C 底盘节点
4. pointcloud_to_laserscan
5. ICP registration
6. Navigation2

启动健康检查会确认：

- 没有重复节点名
- `/scan` 发布者数量为 1
- 底盘订阅 `/cmd_vel_smooth`
- `/Odometry` 有数据
- `/scan` 有有效距离
- `/map` 有数据
- `/global_costmap/costmap` 有数据

## 键盘控制

键盘控制走独立链路：

```bash
./start_chassis_keyboard.sh
```

键盘模式下底盘订阅 `/cmd_vel`。导航模式下底盘订阅 `/cmd_vel_smooth`。不要同时跑键盘控制和导航控制。

## 避障配置

避障现在分两层：

1. Nav2 MPPI + local costmap  
   用 `/scan` 更新局部障碍层，MPPI 根据 footprint 和 costmap 选择更安全的轨迹。

2. collision_monitor  
   最后一层速度保护，把危险方向的输出速度压到 0。

当前 collision monitor 区域：

| 区域 | 作用 |
| --- | --- |
| `PolygonStop` | 前方近距离硬停 |
| `PolygonLeftStop` | 左侧贴身硬停 |
| `PolygonRightStop` | 右侧贴身硬停 |
| `PolygonRearStop` | 后方倒车硬停 |
| `PolygonSlow` | 前方较远距离减速 |

关键参数：

```yaml
cmd_vel_in_topic: "/cmd_vel_raw"
cmd_vel_out_topic: "/cmd_vel_smooth"
source_timeout: 0.8
base_shift_correction: False
```

`base_shift_correction` 关闭是这次实测修复点。之前开启时，collision monitor 会依赖 `odom -> base_link` 时间同步，遇到 Fast-LIO TF 滞后会报 future extrapolation，导致障碍没有稳定压停。

## 点云转激光

当前 `/scan` 来源是：

```text
/cloud_registered_body -> pointcloud_to_laserscan -> /scan
```

关键参数：

```yaml
target_frame: base_link
min_height: 0.05
max_height: 1.20
range_min: 0.20
range_max: 6.0
scan_time: 0.25
```

运行时必须只有一个 `/scan` 发布者：

```bash
ros2 topic info /scan
```

如果出现多个 `/scan` 发布者，Nav2 和 collision monitor 可能被不同来源的数据交替影响，避障会不稳定。

## 验收记录

最近一次验证时间：2026-07-24。

已验证：

```text
bash -n nav.sh                                      OK
YAML 参数解析                                      OK
colcon build --packages-select robot_navigation2   OK
Nav2 MPPI controller loaded                        OK
collision_monitor lifecycle active                 OK
velocity_smoother lifecycle active                 OK
/scan publisher count = 1                          OK
ds20270c_can_node cmd_vel_topic = /cmd_vel_smooth  OK
/scan finite = 625/720                             OK
/map 356x246, 0.05 m/cell                          OK
/global_costmap/costmap 正常                       OK
```

MPPI 加载日志：

```text
Created controller : FollowPath of type nav2_mppi_controller::MPPIController
Configured MPPI Controller: FollowPath
Activated MPPI Controller: FollowPath
```

速度链路注入测试：

```text
/cmd_vel_nav -> /cmd_vel_raw -> /cmd_vel_smooth
/cmd_vel_raw: 20 Hz
/cmd_vel_smooth: 10 Hz
输入 0.12 m/s 后可通过，停止后输出回到 0
```

全向避障 synthetic-only 测试：

```text
front_stop              PASS
left_stop_on_rotate     PASS
right_stop_on_rotate    PASS
rear_stop_on_backup     PASS
all_side_obstacle_status PASS
```

测试说明：避障测试使用 `--safe-base`，底盘 dry_run，不发 CAN。测试时临时停掉真实 `/scan` 发布者，只保留虚拟 LaserScan，用来确认 collision monitor 本身能把危险速度压到 0。

## 常用诊断命令

```bash
ros2 lifecycle get /controller_server
ros2 lifecycle get /velocity_smoother
ros2 lifecycle get /collision_monitor

ros2 param get /controller_server FollowPath.plugin
ros2 param get /controller_server FollowPath.critics
ros2 param get /collision_monitor polygons
ros2 param get /collision_monitor base_shift_correction
ros2 param get /ds20270c_can_node cmd_vel_topic

ros2 topic info /scan
ros2 topic hz /scan
ros2 topic echo --once /scan --field header.frame_id

ros2 topic hz /cmd_vel_nav
ros2 topic hz /cmd_vel_raw
ros2 topic hz /cmd_vel_smooth
```

## 注意事项

- 导航时不要同时启动键盘控制。
- `/scan` 只能有一个发布者。
- 底盘导航模式必须订阅 `/cmd_vel_smooth`。
- 真实物理避障还需要低速放纸箱或挡板复测，先从 `0.08 m/s` 到 `0.12 m/s` 开始。
- safe-base 能证明 ROS2 链路和避障逻辑正确，但不能替代有人看护的真车低速测试。

## 修改维护约定

每次修改导航、底盘、建图、定位、避障或 Web 控制链路后，都要同步更新本 README：

1. 写清楚改了什么文件。
2. 写清楚为什么改。
3. 写清楚怎么启动。
4. 写清楚实际验证命令和结果。
5. 如果有真车风险或还没做物理测试，要明确写出来。

当前备份目录：

```text
.codex_backups/mppi_obstacle_fix_20260724_163503
```
