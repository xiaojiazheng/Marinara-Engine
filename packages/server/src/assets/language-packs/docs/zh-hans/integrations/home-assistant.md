# Home Assistant 集成

本指南介绍如何把 Marinara Engine 连接到 Home Assistant。连上之后，AI 角色就能直接在聊天里控制真实的智能家居设备，包括灯光、温控、窗帘门和媒体播放器。反过来，Home Assistant 的自动化也能把消息发进 Marinara。

Home Assistant 是一个免费的开源智能家居控制平台。没有在用 Home Assistant 的话，这个集成用不上。

## 这个集成做什么

集成本身是一小段软件，安装在 Home Assistant 内部，把运行中的 Home Assistant 和运行中的 Marinara Engine 服务器连起来。装好之后，它会自动完成三件事：

- 在 Marinara 里创建智能家居工具，出现在 Presets(预设) 面板的 **Functions**(函数) 部分。Marinara 把它们称作“custom tools”或“Functions”。Functions 的通用工作方式见[自定义工具](../extending/custom-tools.md)。
- 在 Marinara 里创建一个名为 **Home Assistant** 的 AI 智能体。智能体就是伴随聊天一起运行、替你干活的 AI。见[智能体](../agents/agents-overview.md)。
- 创建若干 Home Assistant 实体，方便从 Home Assistant 这一侧查看和控制 Marinara。实体指 Home Assistant 里的设备、传感器或控制项。

不需要手动复制工具地址，也不需要手动配置工具。首次设置时，集成会把一切自动接好。

## 准备工作

开始之前，请确认下面几项都已具备。

- 一个运行中的 Home Assistant，版本为 2024.1.0 或更高。
- Home Assistant 里已安装 HACS。HACS 即 Home Assistant Community Store，用来安装非内置的自定义集成。
- Marinara Engine 已安装并运行，而且 Home Assistant 所在的机器能访问到它。默认地址是 `localhost:7860`。如果 Home Assistant 跑在另一台设备上，请看下面关于密码的说明。
- Marinara 的 `.env` 文件里已加上 `WEBHOOK_LOCAL_URLS_ENABLED=true`。

`.env` 是 Marinara 服务器的纯文本设置文件。它在哪里、怎么编辑，见[服务器配置](../CONFIGURATION.md)。

最后一项之所以必需，是因为集成用到了 webhook。webhook 是一个网址，让一个应用能自动把数据发给另一个应用。Home Assistant 的 webhook 地址是本地的普通 `http` 地址，而 Marinara 出于安全考虑，默认拦截发往本地 `http` 地址的请求。设置 `WEBHOOK_LOCAL_URLS_ENABLED=true` 就是放行它们。

把这一行加进 `.env` 文件：

```
WEBHOOK_LOCAL_URLS_ENABLED=true
```

这项设置几秒之内就会生效，不用重启 Marinara 服务器。

### 如果 Home Assistant 跑在另一台设备上

集成连接 Marinara 时不带用户名和密码，设置表单里也没有地方可填。因此 Home Assistant 装在哪台机器上很关键：

- Home Assistant 和 Marinara 在同一台机器上时，连接开箱即用。
- Home Assistant 在另一台设备上时，Marinara 默认会拦截连接，必须允许这台设备免密码连入。一种做法是把它的 IP 地址加进 Marinara `.env` 文件里的 `IP_ALLOWLIST`。IP 地址就是设备在网络中的编号地址。如果家里的网络完全可信，也可以改为设置 `ALLOW_UNAUTHENTICATED_PRIVATE_NETWORK=true`。
- 如果 Marinara 用 `BASIC_AUTH_USER` 和 `BASIC_AUTH_PASS` 做了保护，集成无法登录。这时它只能在同一台机器上工作，或者从 `IP_ALLOWLIST` 里列出的设备工作。

这些设置各自怎么起作用、该选哪一个，见[远程访问](../REMOTE_ACCESS.md)。

## 在 Home Assistant 里安装集成

安装分两个阶段：先把它加进 HACS，再完成设置。

### 加进 HACS

1. 在 Home Assistant 里打开 **HACS**。
2. 打开三点菜单，点击 **Custom repositories**(自定义仓库)。
3. 在仓库地址框里填入这个地址：

```
https://github.com/Pasta-Devs/Marinara-Engine
```

4. 把类别设为 **Integration**(集成)，然后点击 **Add**(添加)。
5. 搜索 **Marinara Engine** 并安装。
6. 重启 Home Assistant。

### 完成设置

1. 依次打开 **Settings**(设置)、**Devices & Services**(设备与服务)，点击 **Add Integration**(添加集成)。
2. 搜索 **Marinara Engine**。
3. 填入 Marinara 运行所在的 **Host**(主机) 和 **Port**(端口)。默认是 `localhost` 和 `7860`。
4. 点击 **Submit**(提交)。

如果在填写的地址上访问不到 Marinara，Home Assistant 会报错并中止设置。见下文的疑难排查。

## Marinara Engine 会自动创建什么

设置成功后，集成会把需要的东西全部搭建好。

- 在 Home Assistant 内部注册一个私有 webhook。
- 在 Marinara 的 **Functions** 部分创建智能家居工具，每个工具都已经指向那个 webhook。
- 在 Marinara 里创建 **Home Assistant** 智能体，并列出所有已启用的工具。
- 创建本指南后面介绍的那些 Home Assistant 实体。

## 把 Home Assistant 智能体加进聊天

创建好智能体，并不等于它会自动出现在每个聊天里。想在哪个聊天里控制智能家居，就要把它加进哪个聊天。

1. 打开目标聊天。
2. 打开 **Chat Settings**(聊天设置)，进入 **Agents**(智能体) 部分。
3. 把 **Home Assistant** 智能体加进这个聊天。

Home Assistant 智能体在 Roleplay(角色扮演)、Conversation(对话模式) 和 Game(游戏) 聊天里都能运行。加进去之后，该聊天里的 AI 会自动获得这些智能家居工具，不用再另外开启什么开关。

## 验证是否配置成功

用一个简单请求测一下连接。

1. 按上面的方法，把 **Home Assistant** 智能体加进一个聊天。
2. 在这个聊天里直接用大白话提要求，例如：`Turn on the office lights`。
3. 发送消息。

AI 应该会调用某个智能家居工具，比如 `ha_turn_on`，对应的灯随之亮起。接着 AI 会说明自己做了什么。如果毫无反应，先检查是否设置了 `WEBHOOK_LOCAL_URLS_ENABLED=true`，再看疑难排查。

## 开放的工具类别

集成把智能家居工具分成八类，由你决定 Marinara 可以使用哪几类。

要修改类别，在 Home Assistant 里依次打开 **Settings**、**Devices & Services**，点击 **Marinara Engine**，再点击 **Configure**(配置)。这里有两个选项：

- **Primary Chat**(主聊天)：Home Assistant 服务默认作用的聊天。这些服务在本指南后面介绍。
- **Exposed Tool Categories**(开放的工具类别)：允许 Marinara 使用的工具类别列表。

下表列出每个类别、它的默认状态，以及其中包含的工具。

| 类别 | 默认 | 工具 |
|---|---|---|
| Lights & Switches(灯光与开关) | On | ha_turn_on, ha_turn_off, ha_toggle, ha_set_brightness, ha_set_color, ha_set_color_temp |
| Climate(温控) | On | ha_set_temperature, ha_set_hvac_mode |
| Covers (Blinds & Garage)(遮挡设备：窗帘与车库门) | On | ha_open_cover, ha_close_cover, ha_set_cover_position |
| Locks(门锁) | Off | ha_lock, ha_unlock |
| Media Players(媒体播放器) | On | ha_media_play, ha_media_pause, ha_set_volume |
| Scenes & Scripts(场景与脚本) | On | ha_activate_scene, ha_run_script |
| Query(查询) | On | ha_get_state, ha_list_areas, ha_list_entities, ha_notify |
| Generic Service Calls (Advanced)(通用服务调用：进阶) | Off | ha_call_service |

**Locks** 和 **Generic Service Calls (Advanced)** 默认都是关闭的，确实需要时再开启。**Generic Service Calls (Advanced)** 允许 AI 调用任意 Home Assistant 服务，使用时务必谨慎。

多数工具既接受某个具体设备，也接受房间名。给的是房间名时，工具会一次性作用于那个房间里所有匹配的设备。

类别的改动要等到按下 **Marinara Sync HA Tools** 或重启 Home Assistant 之后才生效。这个按钮在下一节介绍。

## Home Assistant 实体

集成会在名为 **Marinara Engine** 的 Home Assistant 设备下创建这些实体。

| 实体 | 类型 | 作用 |
|---|---|---|
| Marinara Chat Count | 传感器 | 显示 Marinara 聊天的总数 |
| Marinara Active Agent Count | 传感器 | 显示有多少个 Marinara 智能体处于启用状态 |
| Marinara Active Chat | 选择器 | 选择 Home Assistant 服务作用于哪个聊天 |
| Marinara Agent: (name) | 开关 | 启用或禁用某一个 Marinara 智能体，每个智能体一个开关 |
| Marinara Abort Generation | 按钮 | 取消正在生成的 AI 回复 |
| Marinara Sync HA Tools | 按钮 | 重新发送全部工具，并重建 Home Assistant 智能体 |

集成每 30 秒向 Marinara 查询一次新增的聊天和智能体。刚在 Marinara 里建好的聊天或智能体，最多要等 30 秒才会在这边出现。

## 从 Home Assistant 自动化控制 Marinara

集成会添加两个 Home Assistant 服务。它们用在 Home Assistant 的自动化里，而不是在 Marinara 里使用。两个服务默认都作用于 **Primary Chat**。

### Send Message (marinara_engine.send_message)

这个服务向某个 Marinara 聊天发送一条消息。

- `message`：消息正文，必填。
- `chat_id`：发给哪个聊天。留空则使用 Primary Chat。
- `role`：这条消息由谁发出，可以是 `user`、`assistant`、`system` 或 `narrator`，默认是 `user`。
- `trigger_generation`：设为 true 时，消息发出后 AI 会接着回复一条。默认是 false。

下面这个自动化会在前门打开时告诉 AI：

```yaml
automation:
  trigger:
    platform: state
    entity_id: binary_sensor.front_door
    to: "on"
  action:
    service: marinara_engine.send_message
    data:
      message: "Someone just arrived at the front door."
      trigger_generation: true
```

### Trigger Generation (marinara_engine.trigger_generation)

这个服务不发出可见消息，直接让 AI 在聊天里开始回复。

- `chat_id`：使用哪个聊天。留空则使用 Primary Chat。
- `user_message`：可选，随这一轮回复一起带上的消息。

## 改过设置之后重新同步

改动启用的类别之后，按 **Marinara Sync HA Tools** 让改动生效。这个按钮在 Home Assistant 里 **Marinara Engine** 的设备页面上。

按下 **Marinara Sync HA Tools** 会做这几件事：

- 就地更新已有的工具，把改动同步到 Marinara。
- 如果你在 Marinara 里删掉了 **Home Assistant** 智能体，会重新建好它。
- 把已关闭类别下的工具全部禁用，但不会删除它们。

不要在 Marinara 里手动编辑这些 Home Assistant 工具。下一次同步会覆盖改动，并把工具重新开启。

## 故障排查

### 设置表单提示连不上

先确认 Marinara Engine 正在运行，再检查填写的 **Host** 和 **Port** 与它实际监听的地址是否一致。默认是 `localhost` 和 `7860`。

如果 Home Assistant 和 Marinara 不在同一台设备上，Marinara 默认会拦截。集成没办法发送密码，所以 Marinara 必须免密码接受这台设备。把 Home Assistant 设备的 IP 地址加进 Marinara `.env` 文件里的 `IP_ALLOWLIST`。这个做法以及其他可选方案见[远程访问](../REMOTE_ACCESS.md)。用 `BASIC_AUTH_USER` 和 `BASIC_AUTH_PASS` 保护起来的 Marinara 同样会拒绝集成，除非该设备已列在 `IP_ALLOWLIST` 里。

设置完成之后，这些规则依然有效。如果 Marinara 后来拦截了 Home Assistant 设备，传感器和聊天列表会悄无声息地停止更新。

### AI 调用了设备工具，却什么都没发生

多半是 webhook 请求被拦下了。在 Marinara 的 `.env` 文件里加上 `WEBHOOK_LOCAL_URLS_ENABLED=true` 并保存，几秒之内生效。少了这一项，工具调用可能失败，报错内容大意是不允许 `http`，或者拒绝私有地址。

如果 Marinara 和 Home Assistant 在同一台机器上，集成会自动用内部地址访问 webhook。如果 Marinara 在另一台设备上，要确保从那台设备能访问到 Home Assistant 的局域网地址。

### Functions 列表里看不到这些工具

按一下 **Marinara Sync HA Tools**，或者重启 Home Assistant。然后到 Marinara 的 Presets 面板 **Functions** 部分查看。

### 聊天里没有 Home Assistant 智能体

先确认 Marinara 的 Agents 下面确实有 **Home Assistant** 智能体。如果没有，按 **Marinara Sync HA Tools** 重新生成。然后打开 **Chat Settings**，进入 **Agents** 部分，把 **Home Assistant** 智能体加进这个聊天。

### 手动查找 webhook 地址

每个工具都已经填好地址，一般用不上这一步。真要查的话，在 Home Assistant 里依次打开 **Settings**、**Devices & Services**、**Marinara Engine**。webhook 地址的格式如下，其中 8123 是 Home Assistant 的默认端口：

```
http://<homeassistant-ip>:8123/api/webhook/<webhook-id>
```

## 卸载

要移除这个集成，在 Home Assistant 里依次打开 **Settings**、**Devices & Services**、**Marinara Engine**，把它删除。这会一并删掉 Home Assistant 实体。集成在 Marinara **Functions** 部分创建的工具仍会留在 Marinara 里，**Home Assistant** 智能体也一样。不再需要的话，在 Marinara 里手动把这两样删掉。

## 相关指南

- [自定义工具](../extending/custom-tools.md)
- [智能体](../agents/agents-overview.md)
- [服务器配置](../CONFIGURATION.md)
- [远程访问](../REMOTE_ACCESS.md)
