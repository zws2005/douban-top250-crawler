# 数据看板

这是一个无外部前端依赖的静态 Web 看板，数据来自 `analysis/`。

```bash
npm run analyze
npm run dashboard
```

直接打开 `dashboard/index.html`，或启动本地服务：

```bash
npm run dashboard:serve
```

然后访问 `http://localhost:8000`。

看板包含数据总览、历史趋势、短评词云、情感分析、主题模型、多维统计、图书检索和相似高分书推荐。
