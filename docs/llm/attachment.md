# attachment：附件类型

路径：`src/attachment`

附件模块目前提供最小的文件元数据结构，为后续图片、文档和多模态工具预留接口。

```ts
import { createAttachment } from "../../src/attachment";

const attachment = createAttachment({
  name: "cover.jpg",
  mediaType: "image/jpeg",
  path: "data/cover.jpg"
});

console.log(attachment.id);
console.log(attachment.path);
```

`id` 未传入时会自动生成 UUID。
