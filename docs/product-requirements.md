# 产品需求文档（PRD）

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 产品名称 | 豆瓣读书 Top250 数据采集与爬虫 Agent 平台 |
| 文档版本 | v1.0 |
| 文档状态 | 当前实现与后续规划 |
| 更新时间 | 2026-11-09 |
| 目标平台 | Linux / VS Code / Node.js / Python |
| 相关文档 | [Agent 模块文档](llm/README.md)、[项目 README](../README.md) |

## 2. 产品概述

本项目面向课程实验、数据分析学习和 Agent 开发练习，提供从网页采集、数据清洗、统计分析、可视化看板到爬虫 Agent 的完整流程。

产品由四个部分组成：

1. **TypeScript 爬虫**：抓取豆瓣读书 Top250，生成原始 CSV。
2. **Python 数据分析**：使用 pandas 清洗数据，生成报告、图表、趋势和推荐。
3. **Web 数据看板**：以静态网页展示数据总览、趋势、文本分析、多维统计和推荐结果。
4. **DeepSeek Harness Core 精简适配**：提供 Session、Tool Registry、Agent Loop、Provider 和爬虫工具。

## 3. 产品目标

### 3.1 核心目标

- 用一条命令完成抓取、清洗、分析和看板生成。
- 让原始数据、清洗数据、质量标记和分析结果可追溯。
- 提供可扩展到其他网页的数据采集流程。
- 提供一个最小但可运行的爬虫 Agent Core。
- 支持从 GitHub 下载后通过 `npm ci` 和 Python 依赖安装直接运行。

### 3.2 成功标准

- `npm run pipeline` 能稳定生成完整数据与分析结果。
- 自动化测试全部通过。
- 看板不依赖外部前端库即可打开。
- Agent 在没有 API Key 时可以通过离线 Demo 验证工具循环。
- 使用 DeepSeek API 时可以完成多步工具调用。
- 代码、文档和输出目录结构清晰。

### 3.3 非目标

当前版本不包含以下能力：

- 商业级大规模分布式爬虫。
- 绕过登录、验证码或网站访问限制。
- 动态 JavaScript 页面的完整浏览器自动化。
- 多租户 Web 服务和用户权限系统。
- 生产级 Agent 审批、计费、审计和沙箱平台。
- 自动发布 Word/PDF 实验报告。

## 4. 目标用户

| 用户 | 需求 |
| --- | --- |
| 课程学生 | 完成网页抓取、清洗、分析和实验报告 |
| 数据分析初学者 | 使用 pandas 完成数据质量处理与可视化 |
| Agent 开发者 | 学习 Session、Tool Registry、Agent Loop 和 Provider |
| 数据研究者 | 获取可复现的豆瓣 Top250 快照与统计结果 |
| 项目维护者 | 扩展抓取工具、分析模型和 Agent 能力 |

## 5. 用户场景

### 场景 A：一键获取最新榜单数据

用户进入项目目录，执行 `npm run pipeline`，得到最新原始 CSV、清洗 CSV、分析报告、图表、快照和看板。

### 场景 B：查看数据质量与分析结果

用户打开 `analysis/report.md` 或 `dashboard/index.html`，查看评分分布、评价人数、出版社、国家、题材、短评情感和主题。

### 场景 C：查询相似高分书

用户执行 `npm run recommend -- 红楼梦 --top 5`，获得与《红楼梦》相似且评分不低于 9.0 的图书。

### 场景 D：开发爬虫 Agent

用户使用 `AgentLoop`、`ToolRegistry` 和 Provider 构建自己的爬虫 Agent；没有 API Key 时使用 Demo Provider 验证工具循环。

### 场景 E：从 GitHub 直接运行

用户克隆仓库，安装 npm 和 Python 依赖，执行 `npm run pipeline` 或 `npm run agent:demo`。

## 6. 功能需求

### 6.1 数据采集

| 编号 | 优先级 | 需求 | 当前状态 |
| --- | --- | --- | --- |
| FR-01 | P0 | 抓取豆瓣读书 Top250 共 10 页、250 条记录 | 已实现 |
| FR-02 | P0 | 支持 User-Agent、超时、重试和请求间隔 | 已实现 |
| FR-03 | P0 | 提取排名、书名、副标题、作者信息、评分、评价人数、短评、链接和封面 | 已实现 |
| FR-04 | P0 | 输出 `data/raw_books.csv`，保留网页原始文本 | 已实现 |
| FR-05 | P1 | 支持只抓取指定页数、调整请求间隔和输出路径 | 已实现 |
| FR-06 | P2 | 支持动态页面、代理和断点续爬 | 后续规划 |

### 6.2 数据清洗

| 编号 | 优先级 | 需求 | 当前状态 |
| --- | --- | --- | --- |
| FR-07 | P0 | 处理空标题、重复记录、重复书名和异常数值 | 已实现 |
| FR-08 | P0 | 解析作者、出版社、出版日期和人民币价格 | 已实现 |
| FR-09 | P0 | 输出 `data/clean_books.csv` 和数据质量标记 | 已实现 |
| FR-10 | P0 | 评分和评价人数异常时使用中位数填补并记录原因 | 已实现 |
| FR-11 | P1 | 建立数据版本和可重复清洗规则 | 已实现基础版本 |

### 6.3 基础分析

| 编号 | 优先级 | 需求 | 当前状态 |
| --- | --- | --- | --- |
| FR-12 | P0 | 计算平均评分、评分中位数、评价人数和相关系数 | 已实现 |
| FR-13 | P0 | 输出评分榜、评价人数榜和评分区间分布 | 已实现 |
| FR-14 | P0 | 生成 `analysis/report.md` 和 `analysis/summary.json` | 已实现 |
| FR-15 | P0 | 自动刷新评分、出版社和评分/评价人数关系图 | 已实现 |

### 6.4 高级分析

| 编号 | 优先级 | 需求 | 当前状态 |
| --- | --- | --- | --- |
| FR-16 | P1 | 保存日期快照并生成历史趋势 | 已实现，需多日数据形成曲线 |
| FR-17 | P1 | 对短评执行中文分词、词频和词云 | 已实现 |
| FR-18 | P1 | 对短评执行情感分析 | 已实现 |
| FR-19 | P1 | 对短评执行主题模型 | 已实现 |
| FR-20 | P1 | 统计国家/地区、题材、作者和出版社 | 已实现 |
| FR-21 | P1 | 基于 TF-IDF 和余弦相似度生成相似高分书推荐 | 已实现 |
| FR-22 | P2 | 使用更可靠的题材分类或模型标签 | 后续优化 |

### 6.5 Web 看板

| 编号 | 优先级 | 需求 | 当前状态 |
| --- | --- | --- | --- |
| FR-23 | P1 | 生成无需外部前端依赖的静态看板 | 已实现 |
| FR-24 | P1 | 展示总览、趋势、文本、多维统计、检索和推荐 | 已实现 |
| FR-25 | P1 | 支持书名、作者、出版社、国家和题材搜索 | 已实现 |
| FR-26 | P2 | 增加筛选、图表联动和多页面导航 | 后续规划 |

### 6.6 爬虫 Agent Core

| 编号 | 优先级 | 需求 | 当前状态 |
| --- | --- | --- | --- |
| FR-27 | P0 | 按 `agent / agent-loop / llm / scope / session` 划分 Core | 已实现 |
| FR-28 | P0 | 提供 append-only Session 事件日志和 JSONL 持久化 | 已实现 |
| FR-29 | P2 | 提供 Session 消息派生、工具历史、fork 和 repair 等高级能力 | 后续规划 |
| FR-30 | P0 | 提供 ToolRegistry、Schema 和统一错误处理 | 已实现 |
| FR-31 | P0 | 实现模型调用与工具调用的多步循环 | 已实现 |
| FR-32 | P0 | 支持最大步数、AbortSignal 取消和错误中止 | 已实现 |
| FR-33 | P0 | 提供 DeepSeek Provider 和离线 Demo Provider | 已实现 |
| FR-34 | P0 | 提供抓取、批量抓取、CSV 读取和分析工具 | 已实现 |
| FR-35 | P1 | 提供人工审批、工具预算和写操作审计 | 后续规划 |
| FR-36 | P1 | 提供流式输出、Inbox steering 和上下文压缩 | 后续规划 |

### 6.7 工程与文档

| 编号 | 优先级 | 需求 | 当前状态 |
| --- | --- | --- | --- |
| FR-37 | P0 | 提供 TypeScript 和 pandas 自动化测试 | 已实现 |
| FR-38 | P0 | 提供 GitHub 下载后的安装与运行说明 | 已实现 |
| FR-39 | P0 | 提供模块级最小代码示例 | 已实现，见 `docs/llm/` |
| FR-40 | P1 | 增加 CI、格式检查和依赖安全扫描 | 后续规划 |
| FR-41 | P2 | 提供 Docker 镜像和数据库持久化 | 后续规划 |

## 7. 数据需求

### 7.1 原始数据字段

- `rank`：Top250 排名
- `title`：书名
- `subtitle`：副标题
- `author_info`：作者、译者、出版社、日期和价格原文
- `rating_raw`：评分原文
- `rating_count_raw`：评价人数原文
- `quote`：短评
- `url`：详情页
- `cover_url`：封面地址
- `fetched_at`：抓取时间

### 7.2 清洗后字段

- `author`、`publisher`、`publish_date`、`price_cny`
- `rating`、`rating_count`
- `country`、`genre`
- `data_quality_flags`
- `snapshot_date`：快照日期

### 7.3 数据质量要求

- 空标题不进入清洗数据集。
- 完全重复记录和重复书名需要去重。
- 评分必须在 0—10 范围内。
- 评价人数必须为非负整数。
- 无法可靠转换的字段必须留下质量标记。
- 不伪造历史快照和情感/主题结果。
- 外币价格不强行换算成人民币。

## 8. 非功能需求

### 8.1 性能

- 10 页抓取在正常网络下应在一分钟内完成。
- 单次 pandas 分析应在可接受时间内完成。
- 看板静态文件打开时不应依赖后端服务。

### 8.2 可靠性

- 网页请求需要超时和失败重试。
- 原始 CSV 写入采用临时文件加原子重命名。
- Agent 每次运行产生独立 Session 文件。
- 分析失败时给出明确错误，不静默生成空结果。

### 8.3 安全与合规

- DeepSeek API Key 只通过 `DEEPSEEK_API_KEY` 环境变量提供。
- API Key、`.venv`、`node_modules` 和构建产物不提交到 Git。
- 抓取前应遵守目标网站的 robots.txt、服务条款和访问频率限制。
- 不实现绕过登录、验证码或访问控制的功能。
- Agent 的写操作范围应限制在项目目录和数据目录内。

### 8.4 可维护性

- TypeScript 使用严格模式。
- 核心模块按 agent、agent-loop、llm、scope、session 分层。
- 文档提供最小示例，避免只给大段代码。
- 关键流程有自动化测试和验收命令。

### 8.5 可移植性

- 支持 Node.js >= 18.17。
- 支持 Python >= 3.10。
- 支持 Linux 和 VS Code 终端。
- Python 依赖通过 `requirements.txt` 安装。
- 推荐使用 `.venv`，分析脚本自动优先使用虚拟环境。

## 9. 验收标准

### 9.1 数据流程验收

```bash
npm ci
python3 -m venv --system-site-packages .venv
.venv/bin/python -m pip install -r requirements.txt
npm run pipeline
```

应生成：

- `data/raw_books.csv`：250 条
- `data/clean_books.csv`：清洗结果
- `analysis/report.md`
- `analysis/figures/` 图表
- `dashboard/index.html`
- `data/snapshots/YYYY-MM-DD.csv`

### 9.2 Agent Core 验收

```bash
npm test
npm run agent:demo
```

验收标准：

- TypeScript 测试全部通过。
- Agent 完成模型调用、工具调用和结果回填。
- Session JSONL 文件生成。
- 无 API Key 时不报错，使用 Demo Provider。

### 9.3 看板与推荐验收

```bash
npm run dashboard:serve
npm run recommend -- 红楼梦 --top 5
```

验收标准：

- 看板页面可打开并显示数据。
- 搜索和推荐列表可交互。
- 推荐结果包含书名、评分和相似度。

## 10. 风险与限制

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 豆瓣页面结构变化 | 解析失败 | 保持选择器集中、运行 fetch 测试 |
| 访问频率过高 | 请求被限流 | 默认 1.5 秒间隔、重试和低频使用 |
| 历史快照不足 | 趋势图只有一个点 | 持续按日运行 |
| 题材规则不准确 | 分类偏差 | 规则分类标记为启发式，后续可升级模型 |
| DeepSeek API 不可用 | 无法在线 Agent | 保留 Demo Provider 和离线测试 |
| 缺少依赖 | 文本分析降级 | requirements + `.venv` + 错误提示 |

## 11. 后续路线

### P1：Agent 可用性

- 写操作人工审批。
- 工具调用预算和超时策略。
- 流式输出和 Inbox steering。
- 上下文压缩和失败恢复。
- Agent 评测集。

### P2：数据平台

- SQLite/PostgreSQL 持久化。
- 每日定时任务和增量抓取。
- 数据版本、抓取审计和失败队列。
- 动态页面和浏览器抓取。

### P3：产品化

- FastAPI 服务。
- 用户与权限系统。
- 多 Agent 协作。
- 生产级日志、监控和告警。

## 12. 开放问题

- 历史快照运行频率如何设定？
- 题材分类是否改为人工标签或模型分类？
- Agent 写操作应默认要求审批还是仅在危险操作时审批？
- 是否需要保留完整 HTML 快照以复现解析结果？
- 看板是否需要从静态页面升级为 Streamlit 或后端服务？
