# 测试

## 页面

- 光翼页：输入短 ID，切换国内直连 / CF，查看结果
- 衣柜页：输入 UUID，切换线路，查看分类与图标
- 结果支持“复制图片 / 下载图片”，失败会明确报错

## 命令行脚本

插件仓库提供 4 语言等价脚本：

```bash
uv run python doc/scripts/test-api.py [角色ID]
node doc/scripts/test-api.js [角色ID]
powershell -ExecutionPolicy Bypass -File doc/scripts/test-api.ps1 [-RoleId 角色ID]
bash doc/scripts/test-api.sh [角色ID]
```

脚本覆盖 CF 与国内直连两条线路，只测试 3 个公网接口。
