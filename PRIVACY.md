# 隐私政策 / Privacy Policy

_最后更新：2026-08-19 / Last updated: 2026-08-19_

## 中文

### 概述

WhiteTab（白搜）是一个将浏览器新标签页替换为聚合搜索主页的扩展。**本扩展不收集、不存储、不传输任何用户数据到开发者的服务器**——事实上，本项目没有任何服务器。

### 我们不收集的数据

本扩展不收集以下任何信息：

- 个人身份信息（姓名、邮箱、年龄等）
- 健康信息
- 财务与支付信息
- 认证信息（密码、凭据、令牌）
- 个人通信内容
- 位置信息
- 网页浏览记录
- 用户活动数据（点击、鼠标位置、按键记录等）

本扩展不使用分析工具、不埋点、不投放广告、不使用 Cookie 追踪。

### 本地存储

您的设置（页面标题、主题、搜索引擎列表、快捷入口）保存在浏览器的 `localStorage` 中，键名为 `whiteSearch.settings`。

这些数据**仅存在于您的设备本地**，不会被上传。卸载扩展或清除浏览器数据时会一并删除。开发者无法访问这些数据。

### 第三方请求

本扩展在使用过程中会向以下第三方发起请求。这些请求由您的浏览器直接发出，不经过任何中间服务器：

**1. 搜索联想词**

当您在搜索框中输入时，当前输入的文字会被发送到您所选默认搜索引擎对应的联想接口：

| 搜索引擎 | 接口 |
|---|---|
| 百度 | `suggestion.baidu.com` |
| Bing | `api.bing.com` |
| Google | `suggestqueries.google.com` |

仅发送当前输入的文字，且仅发往对应一个接口。返回的联想词直接显示，不作任何存储。

**2. 执行搜索**

按下回车或点击搜索引擎按钮时，浏览器跳转到对应搜索引擎的结果页，行为与您直接访问该搜索引擎相同。

**3. 网站图标**

为显示自定义搜索引擎与快捷入口的图标，本扩展会向 `https://www.google.com/s2/favicons` 请求图标，请求中包含您所配置网站的域名。该请求使用 `referrerpolicy="no-referrer"`。

若您不希望产生此类请求，可以不添加自定义搜索引擎与快捷入口——预置项目使用扩展内置的图标，不发起外部请求。

上述第三方各自的隐私政策适用于发送给它们的数据，本扩展无法控制其数据处理方式。

### 权限说明

本扩展仅声明三项主机权限：`suggestion.baidu.com`、`api.bing.com`、`suggestqueries.google.com`，**唯一用途是获取搜索联想词**。

本扩展不使用内容脚本，不读取或修改任何网页内容，不请求标签页、历史记录、书签等任何其他权限。

### 远程代码

本扩展的全部代码均包含在扩展包内。不加载外部脚本、不使用 `eval()`、不引入远程模块。网络请求仅用于获取数据（JSON 与图片）。

### 变更

本政策的任何变更将更新至本文件，并在版本发布说明中注明。

### 联系方式

如有疑问，请通过 GitHub Issues 联系：<https://github.com/RuiYier/White-Search/issues>

---

## English

### Overview

WhiteTab is a browser extension that replaces the new tab page with a search homepage. **It does not collect, store, or transmit any user data to the developer** — the project has no server of any kind.

### Data we do not collect

This extension collects none of the following:

- Personally identifiable information (name, email, age, etc.)
- Health information
- Financial and payment information
- Authentication information (passwords, credentials, tokens)
- Personal communications
- Location
- Web browsing history
- User activity (clicks, mouse position, keystroke logging, etc.)

No analytics, no telemetry, no advertising, no tracking cookies.

### Local storage

Your settings (page title, theme, search engine list, shortcut links) are stored in the browser's `localStorage` under the key `whiteSearch.settings`.

This data **stays on your device**. It is never uploaded. It is removed when you uninstall the extension or clear browser data. The developer has no access to it.

### Third-party requests

The extension makes the following requests during use. They are issued directly by your browser and do not pass through any intermediary server.

**1. Search suggestions**

As you type in the search box, the current query text is sent to the suggestion endpoint of your selected default search engine:

| Engine | Endpoint |
|---|---|
| Baidu | `suggestion.baidu.com` |
| Bing | `api.bing.com` |
| Google | `suggestqueries.google.com` |

Only the typed text is sent, and only to the single matching endpoint. Responses are rendered as a suggestion list and are not stored.

**2. Performing a search**

Pressing Enter or clicking an engine button navigates to that engine's results page — the same as visiting the search engine directly.

**3. Site icons**

To display icons for custom search engines and shortcut links, the extension requests icons from `https://www.google.com/s2/favicons`, which includes the domain you configured. These requests use `referrerpolicy="no-referrer"`.

If you prefer to avoid such requests, do not add custom engines or shortcuts — the preset entries use icons bundled with the extension and make no external requests.

Data sent to these third parties is governed by their respective privacy policies, which are outside this extension's control.

### Permissions

The extension declares only three host permissions: `suggestion.baidu.com`, `api.bing.com`, and `suggestqueries.google.com`, used **solely to fetch search suggestions**.

It uses no content scripts, reads or modifies no web page content, and requests no other permissions such as tabs, history, or bookmarks.

### Remote code

All code ships inside the extension package. No external scripts are loaded, `eval()` is not used, and no remote modules are imported. Network requests retrieve data only (JSON and images).

### Changes

Any changes to this policy will be reflected in this file and noted in the release notes.

### Contact

Questions can be raised via GitHub Issues: <https://github.com/RuiYier/White-Search/issues>
