# KPL 应用数据端 v1

前端瀑布流只依赖 `applicationRecords`，数据端可以来自 JSON、数据库或 API。每条记录是一项可替换战队/选手/比赛节点的应用模板。

```ts
{
  id: string;                         // 稳定 ID，用于缓存和埋点
  type: 'game'|'content'|'city'|'insight';
  title: string; label: string;       // 展示名称和英文标签
  summary: string;                    // 一句话价值说明
  source: string[];                   // 数据实体类型
  query: {
    entities: string[];               // 要查询的节点类型
    relations: string[];              // 要展开的关系
    filters?: Record<string,string>;  // 赛季、日期、是否有 BP 等过滤条件
  };
  output: {
    format: 'card'|'poster'|'game'|'map'|'video';
    fields: string[];                  // 输出物字段
    template: string;                  // 前端/生成器模板 ID
  };
  evidence: {
    metric?: string;                  // 展示用规模或验证指标
    refs: string[];                    // 文件、接口或查询结果引用
  };
  status: 'demo'|'ready'|'needs-data'; // 当前可演示程度
}
```

当前第一批 12 条案例在 `applicationData.ts` 中，覆盖：战队 DNA、选手生涯卡、BP 竞猜、赛前预告、智能战报、高光短视频、历史上的今天、战队经理、经典战役重演、城市电竞地图、城市打卡任务、社交内容包。

接真实后端时建议提供：

`GET /api/applications` 返回记录列表；`POST /api/applications/:id/render` 接收 `query.filters` 和用户偏好，返回 `output` 对应的文案、图片、视频或交互配置；每次返回保留 `evidence.refs`，保证内容可溯源。
