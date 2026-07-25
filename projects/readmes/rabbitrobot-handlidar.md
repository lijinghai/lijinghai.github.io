# ljh_fastLivo2

Mid360 + 海康相机 + FAST-Calib + FAST-LIVO2 的 ROS2 Jazzy 工作区。

这个项目主要实现两件事：

1. 使用 Livox Mid360 和海康 MV-CU013 相机完成雷达-相机外参标定。
2. 使用 FAST-LIVO2 运行视觉-激光融合 SLAM，并通过 RViz 或浏览器 Web 页面查看点云效果。

项目作者：算个文科生吧  
联系方式：wx: RabbitRobot2025

---

## 1. 当前项目实际情况

| 项目 | 当前配置 |
| --- | --- |
| 系统 | Ubuntu 24.04 |
| ROS2 | Jazzy |
| 雷达 | Livox Mid360 |
| 相机 | 海康 MV-CU013 |
| 工作区路径 | `~/Desktop/ljh/code/ljh_fastLivo2` |
| 雷达默认 IP | `192.168.1.132` |
| 主机网口默认 IP | `192.168.1.50/24` |
| 主机有线网口默认名 | `eno1` |
| 雷达原始话题 | `/livox/lidar` |
| 相机原始图像话题 | `/camera/color/image_raw` |
| FAST-LIVO2 点云话题 | `/cloud_registered` |
| Web 图像话题 | `/rgb_img` |
| Web 默认端口 | `8080` |

如果你的电脑网口不是 `eno1`，启动前需要指定，例如：

```bash
LIVOX_IFACE=enp3s0 sudo bash scripts/setup_hardware.sh
```

---

## 2. 项目目录结构

项目根目录保持清爽：Web、脚本、源码、编译产物各放各的位置。

```text
ljh_fastLivo2/
├── web/                         # 浏览器点云查看器，只放前端文件
│   ├── index.html
│   ├── style.css
│   └── viewer.js
├── scripts/                     # 日常使用入口脚本，单独放在根目录
│   ├── setup_hardware.sh        # 配置 Livox 网口和海康 USB 权限
│   ├── launch_mid360_hik.sh     # 一键启动 FAST-LIVO2
│   ├── launch_web_viewer.sh     # 启动 Web 点云查看器
│   ├── open_rviz_default.sh     # 单独打开默认 RViz 配置
│   └── fast_livo_web_bridge.py  # ROS2 到浏览器的 HTTP 桥接后端
├── src/                         # ROS2 包和源码相关资料
│   ├── FAST-LIVO2/              # FAST-LIVO2 主算法包
│   ├── FAST-Calib-ROS2/         # 雷达-相机外参标定包
│   ├── livox_ros_driver2/       # Livox Mid360 驱动
│   ├── hik_camera_ros2_driver/  # 海康相机驱动
│   ├── image_common/            # camera_info_manager 等依赖
│   ├── rpg_vikit/               # FAST-LIVO2 依赖库
│   ├── Sophus/                  # FAST-LIVO2 依赖库
│   ├── config/                  # udev 等配置资料，不是 ROS 包
│   ├── deps/                    # 本地第三方依赖，例如 Livox SDK2
│   ├── calib_data/              # 标定 bag、稳态图等数据
│   ├── docs/                    # 文档图片
│   └── archive/                 # 旧文件备份
├── build/                       # colcon 编译中间文件，自动生成
├── install/                     # colcon 安装结果，运行时 source 这里
├── log/                         # colcon 日志和运行日志
├── MvSdkLog/                    # 海康 SDK 运行时可能自动生成的日志
└── README.md
```

`src/config`、`src/deps`、`src/docs`、`src/calib_data`、`src/archive` 中放了 `COLCON_IGNORE`，所以 colcon 不会把这些资料目录误识别成 ROS2 包。

---

## 3. 当前 ROS2 包

在项目根目录执行：

```bash
colcon list
```

当前应识别到这些包：

```text
camera_calibration_parsers
camera_info_manager
fast_calib
fast_livo
hik_camera_ros2_driver
livox_ros_driver2
sophus
vikit_common
vikit_ros
```

---

## 4. 第一次拿到项目：从 0 到跑出点云

这一节是给第一次拿到项目的人看的。按照顺序执行，先保证 SLAM 和 Web 都能跑起来，再去做标定。

### 第 1 步：进入工作区

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
pwd
ls
```

正常应该能看到：

```text
web  scripts  src  build  install  log  README.md
```

### 第 2 步：加载 ROS2 Jazzy

```bash
source /opt/ros/jazzy/setup.bash
ros2 --help
```

如果 `ros2 --help` 能正常输出，说明 ROS2 环境存在。

### 第 3 步：第一次全量编译

第一次拿到项目，建议全量编译：

```bash
colcon build
source install/setup.bash
```

编译结束后检查关键包：

```bash
ros2 pkg prefix fast_livo
ros2 pkg prefix fast_calib
ros2 pkg prefix livox_ros_driver2
ros2 pkg prefix hik_camera_ros2_driver
```

这些命令能输出 `install/...` 下的路径，说明工作区编译和环境加载正常。

### 第 4 步：连接硬件

1. Livox Mid360 接电脑有线网口，并确认雷达供电正常。
2. 海康 MV-CU013 相机接 USB。
3. 确认网线、USB、供电都稳定。

检查相机 USB：

```bash
lsusb | grep -i 2bdf
```

检查雷达网络：

```bash
ping -c 2 192.168.1.132
```

如果雷达 ping 不通，先继续执行下一步配置网口。

### 第 5 步：配置 Livox 网口和海康 USB 权限

默认网口名是 `eno1`：

```bash
sudo bash scripts/setup_hardware.sh
```

如果你的网口不是 `eno1`，先查看网口名：

```bash
ip link
```

然后指定网口，例如：

```bash
LIVOX_IFACE=enp3s0 sudo bash scripts/setup_hardware.sh
```

这个脚本会做两件事：

1. 把主机 Livox 网口配置为 `192.168.1.50/24`。
2. 安装海康 USB 权限规则到 `/etc/udev/rules.d/99-hikrobot-usb.rules`。

如果刚安装完相机权限规则，建议重新插拔相机。

### 第 6 步：启动 FAST-LIVO2

```bash
bash scripts/launch_mid360_hik.sh
```

这个脚本会自动：

1. 调用 `scripts/setup_hardware.sh`。
2. 加载 `/opt/ros/jazzy/setup.bash`。
3. 加载 `install/setup.bash`。
4. 执行 `ros2 launch fast_livo mapping_mid360_hik.launch.py`。

实际 launch 文件是：

```text
src/FAST-LIVO2/launch/mapping_mid360_hik.launch.py
```

它会启动：

- Livox Mid360 驱动
- 海康相机驱动
- FAST-LIVO2 映射节点 `fastlivo_mapping`
- RViz 显示

### 第 7 步：检查话题是否正常

另开一个终端：

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
source /opt/ros/jazzy/setup.bash
source install/setup.bash
```

检查雷达原始数据：

```bash
ros2 topic hz /livox/lidar
```

检查相机原始图像：

```bash
ros2 topic hz /camera/color/image_raw
```

检查 FAST-LIVO2 输出点云：

```bash
ros2 topic hz /cloud_registered
```

检查 Web 使用的图像话题：

```bash
ros2 topic hz /rgb_img
```

判断方式：

- `/livox/lidar` 有频率：雷达驱动正常。
- `/camera/color/image_raw` 有频率：相机驱动正常。
- `/cloud_registered` 有频率：FAST-LIVO2 已经在输出点云。
- RViz 中有点云和图像：SLAM 基本跑通。

### 第 8 步：启动 Web 点云查看器

另开一个终端：

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
bash scripts/launch_web_viewer.sh
```

本机浏览器打开：

```text
http://127.0.0.1:8080/
```

局域网其他设备访问时，把 IP 换成这台主机的 IP：

```text
http://<主机IP>:8080/
```

Web 页面默认显示 `/cloud_registered` 点云。

Web 点云查看器效果图：

![Web 点云查看器效果图](src/docs/images/web_pointcloud_result.png)

---

## 5. 启动流程详解

### 5.1 只想跑 SLAM 和 RViz

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
bash scripts/launch_mid360_hik.sh
```

适合调试雷达、相机、FAST-LIVO2 主流程。

### 5.2 只想打开 Web 查看器

前提：ROS2 里已经有 `/cloud_registered` 点云，或者准备在 Web 页面里点击“启动”。

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
bash scripts/launch_web_viewer.sh
```

打开：

```text
http://127.0.0.1:8080/
```

### 5.3 用 Web 页面启动 SLAM

先启动 Web：

```bash
bash scripts/launch_web_viewer.sh
```

然后浏览器打开：

```text
http://127.0.0.1:8080/
```

点击页面右上角“启动”。这个按钮会请求：

```text
/api/launch
```

后端会执行：

```bash
bash scripts/launch_mid360_hik.sh
```

### 5.4 只重新打开 RViz

如果 SLAM 已经在运行，只是 RViz 关掉了：

```bash
bash scripts/open_rviz_default.sh
```

这个脚本会打开：

```text
install/fast_livo/share/fast_livo/rviz_cfg/fast_livo2.rviz
```

---

## 6. 标定流程：一步一步完成雷达-相机外参标定

标定使用的是：

```text
src/FAST-Calib-ROS2/
```

核心配置文件：

```text
src/FAST-Calib-ROS2/config/qr_params.yaml
```

标定数据统一放在：

```text
src/calib_data/
```

当前示例数据目录：

```text
src/calib_data/mid360_hik_02/
```

### 6.1 标定前准备

先确认硬件连接正常：

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
source /opt/ros/jazzy/setup.bash
source install/setup.bash
```

确认雷达：

```bash
ping -c 2 192.168.1.132
```

确认相机：

```bash
lsusb | grep -i 2bdf
```

确认 FAST-Calib 包存在：

```bash
ros2 pkg prefix fast_calib
```

如果没有输出，先编译：

```bash
colcon build --packages-select fast_calib livox_ros_driver2 hik_camera_ros2_driver
source install/setup.bash
```

### 6.2 启动标定预览

标定预览 launch 文件：

```text
src/FAST-Calib-ROS2/launch/calib_preview.launch.py
```

启动：

```bash
ros2 launch fast_calib calib_preview.launch.py
```

这个预览会启动：

- Livox Mid360 驱动
- 海康相机驱动
- Livox 自定义点云转换节点
- 标定板识别预览节点
- RViz 预览界面

预览时需要确认：

1. 相机画面正常。
2. 标定板能被相机看到。
3. ArUco / QR 标记识别数量正常，理想情况是 `4/4`。
4. RViz 中雷达点云能看到标定板附近的点云结构。
5. 标定板尽量静止，画面不要过曝或太暗。

如果只想开预览但不开 RViz：

```bash
ros2 launch fast_calib calib_preview.launch.py use_rviz:=false
```

### 6.3 录制标定 bag

预览正常后，保持 `calib_preview.launch.py` 继续运行。

另开一个终端：

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
source /opt/ros/jazzy/setup.bash
source install/setup.bash
```

新建本次标定数据目录名，例如：

```bash
DATASET=mid360_hik_03
```

开始录 bag：

```bash
ros2 bag record /livox/lidar /camera/color/image_raw \
  -o src/calib_data/${DATASET}
```

录制要求：

1. 标定板保持静止。
2. 雷达和相机都能看到标定板。
3. 录制 5 到 10 秒即可。
4. 不要边录边移动设备。

停止录制：按 `Ctrl + C`。

检查 bag：

```bash
ros2 bag info src/calib_data/${DATASET}
```

应该能看到至少两个话题：

```text
/livox/lidar
/camera/color/image_raw
```

### 6.4 从 bag 中提取稳态图像

FAST-Calib 需要一张稳定的相机图像，通常命名为：

```text
steady_frame.png
```

执行：

```bash
python3 src/FAST-Calib-ROS2/scripts/get_png.py \
  src/calib_data/${DATASET}/${DATASET}_0.db3 \
  /camera/color/image_raw \
  src/calib_data/${DATASET} \
  --skip 15
```

执行后检查：

```bash
ls src/calib_data/${DATASET}
```

应能看到类似：

```text
steady_frame.png
```

如果没有生成，检查：

1. bag 里是否有 `/camera/color/image_raw`。
2. `${DATASET}_0.db3` 文件名是否正确。
3. `--skip 15` 是否跳过太多帧，可以改小一点，例如 `--skip 5`。

### 6.5 修改 FAST-Calib 参数文件

打开：

```text
src/FAST-Calib-ROS2/config/qr_params.yaml
```

重点修改这几项：

```yaml
lidar_topic: "/livox/lidar"
bag_path: "/home/dev/Desktop/ljh/code/ljh_fastLivo2/src/calib_data/mid360_hik_03"
image_path: "/home/dev/Desktop/ljh/code/ljh_fastLivo2/src/calib_data/mid360_hik_03/steady_frame.png"
output_path: "/home/dev/Desktop/ljh/code/ljh_fastLivo2/src/FAST-Calib-ROS2/output"
```

如果你的数据目录不是 `mid360_hik_03`，就改成你的实际目录名。

还要确认标定板参数和实际标定板一致，例如：

```yaml
delta_width_qr_center: 0.55
delta_height_qr_center: 0.35
```

这两个值表示标记中心之间的距离参数，必须和你的实际标定板一致。如果标定板尺寸换了，这里也要同步改。

### 6.6 运行外参标定

参数改好后执行：

```bash
ros2 launch fast_calib calib.launch.py
```

如果不想打开 RViz：

```bash
ros2 launch fast_calib calib.launch.py rviz:=false
```

标定过程会读取：

- `qr_params.yaml`
- `bag_path` 指向的 bag
- `image_path` 指向的稳态图像

输出会写到：

```text
src/FAST-Calib-ROS2/output/
```

### 6.7 查看标定结果

标定完成后，重点找输出中的外参结果，一般会包含旋转和平移，例如：

```text
Rcl / Pcl
```

含义通常是：

- `Rcl`：相机和雷达之间的旋转矩阵。
- `Pcl`：相机和雷达之间的平移向量。

如果输出了 `.ply` 或其他点云文件，可以使用：

```bash
python3 src/FAST-Calib-ROS2/scripts/show_ply.py <输出的ply文件>
```

具体文件名以 `src/FAST-Calib-ROS2/output/` 中实际生成为准。

### 6.8 把标定结果写入 FAST-LIVO2

FAST-LIVO2 的 Mid360 + 海康配置文件是：

```text
src/FAST-LIVO2/config/mid360_hik_default.yaml
```

把 FAST-Calib 输出的外参写入这个文件中的 `Rcl` 和 `Pcl` 对应位置。

写入前建议备份：

```bash
cp src/FAST-LIVO2/config/mid360_hik_default.yaml \
   src/FAST-LIVO2/config/mid360_hik_default.yaml.bak
```

写完后重新编译或重新 source，确保 install 中使用的是最新配置：

```bash
colcon build --packages-select fast_livo
source install/setup.bash
```

然后重新启动 FAST-LIVO2：

```bash
bash scripts/launch_mid360_hik.sh
```

### 6.9 验证标定是否有效

标定写入后，观察：

1. RViz 中图像和点云的空间关系是否合理。
2. Web 中 RGB 点云是否贴合场景。
3. 移动设备时点云是否连续稳定。
4. 墙面、桌面、标定板等平面是否明显错位。

检查点云输出：

```bash
ros2 topic hz /cloud_registered
```

启动 Web 查看效果：

```bash
bash scripts/launch_web_viewer.sh
```

浏览器打开：

```text
http://127.0.0.1:8080/
```

### 6.10 标定流程总结

完整标定命令顺序如下：

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
source /opt/ros/jazzy/setup.bash
source install/setup.bash

# 1. 预览
ros2 launch fast_calib calib_preview.launch.py

# 2. 另开终端录 bag
DATASET=mid360_hik_03
ros2 bag record /livox/lidar /camera/color/image_raw \
  -o src/calib_data/${DATASET}

# 3. 提取稳态图像
python3 src/FAST-Calib-ROS2/scripts/get_png.py \
  src/calib_data/${DATASET}/${DATASET}_0.db3 \
  /camera/color/image_raw \
  src/calib_data/${DATASET} \
  --skip 15

# 4. 修改参数文件
# src/FAST-Calib-ROS2/config/qr_params.yaml

# 5. 运行标定
ros2 launch fast_calib calib.launch.py

# 6. 写入 FAST-LIVO2 配置
# src/FAST-LIVO2/config/mid360_hik_default.yaml

# 7. 重新编译 FAST-LIVO2 并验证
colcon build --packages-select fast_livo
source install/setup.bash
bash scripts/launch_mid360_hik.sh
```

---

## 7. 常用脚本说明

### `scripts/setup_hardware.sh`

配置 Livox 网口和海康 USB 权限。

```bash
sudo bash scripts/setup_hardware.sh
```

### `scripts/launch_mid360_hik.sh`

一键启动 FAST-LIVO2。

```bash
bash scripts/launch_mid360_hik.sh
```

### `scripts/launch_web_viewer.sh`

启动 Web 后端和浏览器页面服务。

```bash
bash scripts/launch_web_viewer.sh
```

自定义端口：

```bash
PORT=8090 bash scripts/launch_web_viewer.sh
```

### `scripts/open_rviz_default.sh`

只打开默认 RViz 配置。

```bash
bash scripts/open_rviz_default.sh
```

### `scripts/fast_livo_web_bridge.py`

Web 后端桥接脚本。一般不用手动运行，`launch_web_viewer.sh` 会自动调用。

它订阅：

```text
/cloud_registered
/rgb_img
```

它提供：

```text
/api/cloud
/api/image
/api/launch
/api/launch/status
/api/launch/stop
```

---

## 8. 编译和依赖说明

Livox SDK2 放在：

```text
src/deps/livox-sdk2/
```

`src/livox_ros_driver2/CMakeLists.txt` 已经按当前目录结构指向这个位置。

常用编译命令：

```bash
# 全量编译
colcon build
source install/setup.bash

# 只编译 SLAM 和标定
colcon build --packages-select fast_livo fast_calib
source install/setup.bash

# 只编译雷达和相机驱动
colcon build --packages-select livox_ros_driver2 hik_camera_ros2_driver
source install/setup.bash
```

如果移动目录后 Livox 驱动仍然找旧路径，清理旧缓存再编译：

```bash
rm -rf build/livox_ros_driver2 install/livox_ros_driver2
source /opt/ros/jazzy/setup.bash
colcon build --packages-select livox_ros_driver2
source install/setup.bash
```

---

## 9. 常见问题排查

### 9.1 Web 能打开，但是没有点云

先检查 FAST-LIVO2 是否有输出：

```bash
ros2 topic hz /cloud_registered
```

再检查 Web 后端是否拿到数据：

```bash
curl http://127.0.0.1:8080/api/cloud
```

判断：

- `/cloud_registered` 没有频率：问题在 SLAM 或传感器侧。
- `/cloud_registered` 有频率，但 `/api/cloud` 没数据：问题在 Web bridge 订阅侧。
- `/api/cloud` 有数据，但页面不显示：问题在 `web/viewer.js` 前端显示侧。

### 9.2 Web 显示 HTTP 404

检查 Web 后端是否启动：

```bash
curl http://127.0.0.1:8080/api/launch/status
```

检查前端请求路径是否仍然是：

```text
/api/cloud
/api/image
```

### 9.3 点云显示了，但是移动设备后点云不动

按顺序检查：

```bash
ros2 topic hz /cloud_registered
curl http://127.0.0.1:8080/api/cloud
```

如果接口返回数据不变化，说明后端拿到的点云本身没有变化。  
如果接口返回数据变化，但浏览器不变化，再检查 `web/viewer.js`。

### 9.4 雷达不通

检查网口 IP：

```bash
ip addr show eno1
ping -c 2 192.168.1.132
```

如果网口名不是 `eno1`，重新指定：

```bash
LIVOX_IFACE=enp3s0 sudo bash scripts/setup_hardware.sh
```

### 9.5 海康相机没权限或找不到设备

检查 USB：

```bash
lsusb | grep -i 2bdf
```

重新安装 udev 规则：

```bash
sudo bash scripts/setup_hardware.sh
```

然后重新插拔相机。

### 9.6 标定时识别不到 4 个标记

检查：

1. 标定板是否完整出现在相机画面内。
2. 光照是否过暗或过曝。
3. 相机是否虚焦。
4. `qr_params.yaml` 里的标定板尺寸是否和实际一致。
5. 标定板是否被点云覆盖到。

### 9.7 标定结果不稳定

建议：

1. 录 bag 时保持雷达、相机、标定板都静止。
2. 标定板离传感器不要太近，也不要太远。
3. 录制 5 到 10 秒即可，不要录太长的无效数据。
4. 换一个角度重新采一组数据对比。
5. 检查 `steady_frame.png` 是否清晰。

---

## 10. 维护约定

1. 前端页面只放在 `web/`。
2. 日常入口脚本只放在 `scripts/`。
3. ROS2 功能包放在 `src/`。
4. 标定数据放在 `src/calib_data/`。
5. 本地第三方依赖放在 `src/deps/`。
6. 配置资料放在 `src/config/`。
7. `build/`、`install/`、`log/` 都是生成物，不在里面手动改源码。
8. `MvSdkLog/` 是海康 SDK 可能自动生成的日志，可以根据需要清理或归档。

---

## 11. 最短启动流程

如果项目已经编译好、硬件也接好了，最短流程是：

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
sudo bash scripts/setup_hardware.sh
bash scripts/launch_mid360_hik.sh
```

另开一个终端启动 Web：

```bash
cd ~/Desktop/ljh/code/ljh_fastLivo2
bash scripts/launch_web_viewer.sh
```

浏览器打开：

```text
http://127.0.0.1:8080/
```
