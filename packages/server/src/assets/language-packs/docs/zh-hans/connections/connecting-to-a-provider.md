# 连接 AI 服务商

本指南介绍如何把 Marinara Engine 连到 AI 服务商，让角色能够回复。整个流程是：新建一个连接，粘贴 API 密钥，选好模型，再测试能不能用。

## 什么是连接

连接就是保存下来的一套接入信息，告诉 Marinara Engine 怎么访问某个 AI 服务。每个连接保存四样东西：服务商、API 密钥或登录信息、基础 URL(服务的网址)，以及模型。

API 密钥是 AI 服务商给的一串秘密字符，作用和密码一样。Marinara 靠它访问 AI 服务、使用你在那边的账号。Marinara 会加密保存密钥，导出连接时也绝不会带上它。

Marinara Engine 不自带现成的连接，也不送免费的入门密钥。全新安装后连接数量为零，开始聊天前至少要创建一个连接。

## 打开 Connections 面板

连接在应用右侧的 **Connections**(连接) 面板里管理。

如果一个连接都还没有就去开始聊天，Marinara 会弹出 **Set Up**(开始设置) 窗口，里面有一个 **Open Connections** 按钮，点它可以直接跳到 **Connections** 面板。

面板顶部有三个按钮，只有图标，没有文字标签。

- **New**(新建，加号图标)：打开 **Create Connection**(创建连接) 窗口。
- **Import**(导入，向下箭头图标)：从文件加载连接。
- **Select**(选择，对勾图标)：开启批量选择，可以一次导出或删除多个连接。

## 创建连接

按下面的步骤添加第一个服务商。

1. 在 **Connections** 面板里点击 **New** 按钮（加号图标）。
2. 在 **Create Connection** 窗口里给连接填一个 **Name**(名称)，取个以后一眼能认出来的名字，比如 `GPT-4o Main`。
3. 在 **Provider**(服务商) 下面点击要用的服务，比如 **OpenAI**、**Anthropic** 或 **OpenRouter**。
4. 点击 **Create**(创建)。Marinara 会创建这个连接，并打开它完整的 **Connection Editor**(连接编辑器)。
5. 找到 **API Key**(API 密钥) 输入框，把服务商那边的密钥粘贴进去。还没有密钥的话，点击输入框下方的 **Get your {Provider} API key** 链接，浏览器会打开该服务商的密钥页面。
6. 打开 **Model**(模型) 下拉菜单选一个模型。在 **Search models…** 搜索框里输入文字可以过滤列表。列表是空的，就点击 **Fetch Models from API**，加载账号能用的模型。Marinara 会把获取到的列表随连接一起保存，之后聊天输入框里的模型菜单不用重新获取就能直接显示。
7. 点击 **Save**(保存)。顶部附近的状态文字会变成 **Saved**。

之后想换模型，不必打开编辑器：用 Quick Connection Switcher(快速连接切换器)（聊天输入框里的链接图标），或者 **Chat Settings → Connection**(聊天设置 → 连接) 里的 **Model** 字段都可以。见[随机池与 Quick Connection Switcher](organizing-connections.md#the-random-pool-and-quick-connection-switcher)。

**Base URL**(基础 URL) 输入框一般不用动，已知的服务商 Marinara 都会自动填好。只有使用代理或本地服务器时才需要改。

所有支持的服务商、各自的默认设置，以及每个密钥的获取地址，见[支持的 AI 服务商](providers-reference.md)。

有些服务商用本地登录代替 API 密钥，这类连接没有 **API Key** 输入框。见 [Claude、ChatGPT 和 Grok 订阅连接](subscription-clis.md)。

要连接跑在自己电脑上的模型，见[连接本地或自托管模型](local-self-hosted.md)。

## 测试连接

**Connection Editor** 底部有一张 **Connection Tests**(连接测试) 卡片。正式聊天之前，用它确认配置没问题。

1. 点击 **Test Connection**(测试连接)。Marinara 会拿 API 密钥去服务商那边验证。成功时会出现一行绿色的 **Connection Test: Success**，后面带响应时间。
2. 点击 **Send Test Message**(发送测试消息)。Marinara 会向选好的模型发送“hi”这个词，并显示回复。成功时会出现一行绿色的 **Test Message: Success**，下面是模型的回答。

没选模型之前，**Send Test Message** 按钮一直是禁用状态。测试失败时那一行会变红并显示错误信息，通常从中就能看出要改什么，比如密钥不对，或者模型不存在。

## 给聊天选择连接

连接本身不会做任何事，每个聊天各自选择要用哪个连接。

1. 打开一个聊天，再打开它的 **Chat Settings**(聊天设置)。
2. 找到 **Connection** 这一节。
3. 从下拉菜单里选择自己的连接。

下拉菜单里还有两个特殊选项。**None** 表示还没有选连接。**🎲 Random**(Random 前面是一个骰子图标) 每次从随机池里挑一个不同的连接。在 Game Mode(游戏模式) 里这一节仍然叫 **Connection**，但里面的下拉菜单标签是 **GM / Party Model**。

新建聊天时，**Set Up** 窗口会先让你选一个连接。选好之后点击 **Create Chat**(创建聊天)。

## 常见错误

测试或消息发送失败时，先检查这几项：

- **API Key** 填错了或者已经过期。打开连接，重新粘贴密钥，然后点击 **Save**。
- 没有选模型。选好 **Model** 之前，**Send Test Message** 一直不可点。
- 用了别家服务商的密钥。每个服务商都要用自己的密钥。切换 **Provider** 时 **API Key** 输入框会被清空，这是有意为之。
- **Base URL** 被拦截或者访问不通。除非自己跑本地服务器或代理服务器，否则留空、用服务商的默认地址就行。

更多连接错误和生成错误的解决办法，见 [Marinara Engine 故障排查](../TROUBLESHOOTING.md)。

## 相关指南

- [支持的 AI 服务商](providers-reference.md)
- [Claude、ChatGPT 和 Grok 订阅连接](subscription-clis.md)
- [连接本地或自托管模型](local-self-hosted.md)
- [Marinara Engine 故障排查](../TROUBLESHOOTING.md)
