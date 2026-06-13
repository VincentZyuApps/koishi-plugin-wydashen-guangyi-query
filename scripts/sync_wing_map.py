#!/usr/bin/env python3
"""
同步光翼映射表

从网易官方远程 URL 拉取最新的光翼 ID 映射 JSON，
更新 src/types.ts 中 WingTagMap 的兜底数据。

用法:
    python scripts/sync_wing_map.py
"""

import json
import re
import urllib.request
from pathlib import Path

REMOTE_URL = "https://s.166.net/config/ds_yy_02/ma75_wing_wings.json"
TYPES_FILE = Path(__file__).resolve().parent.parent / "src" / "types.ts"


def fetch_remote_wing_map() -> list[dict]:
    """从远程 URL 拉取光翼映射表。"""
    print(f"🌐 正在拉取远程光翼映射表: {REMOTE_URL}")
    with urllib.request.urlopen(REMOTE_URL, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    if not isinstance(data, list):
        raise ValueError(f"远程返回的数据格式不是数组: {type(data).__name__}")

    print(f"✅ 拉取成功，共 {len(data)} 条光翼数据")
    return data


def format_ts_json(data: list[dict]) -> str:
    """将数据格式化为压缩的 TypeScript 数组字符串。

    每个光翼占 2 行：
      // no.1
      { "光翼名字": "...", "一级标签": "...", "二级标签": "..." },
    """
    lines = ["["]
    for i, item in enumerate(data, start=1):
        obj = (
            "{ "
            f'"光翼名字": "{item["光翼名字"]}", '
            f'"一级标签": "{item["一级标签"]}", '
            f'"二级标签": "{item["二级标签"]}" '
            "},"
        )
        lines.append(f"  // no.{i}")
        lines.append(f"  {obj}")
    lines.append("]")
    return "\n".join(lines)


def find_wing_tag_map_range(content: str) -> tuple[int, int]:
    """找到 WingTagMap 数组在文件中的起止位置（起始为 '[' 的位置，结束为 '];' 之后的位置）。"""
    prefix = "export const WingTagMap = "
    start = content.find(prefix)
    if start == -1:
        raise RuntimeError(f"未在 {TYPES_FILE} 中找到 WingTagMap 定义")

    array_start = start + len(prefix)
    if content[array_start] != "[":
        raise RuntimeError("WingTagMap 定义格式不符合预期")

    depth = 0
    in_string = False
    escape = False
    i = array_start
    while i < len(content):
        ch = content[i]

        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            i += 1
            continue

        if ch == '"':
            in_string = True
            i += 1
            continue

        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                # 找到结束位置，跳过接下来的 ';\n'
                end = i + 1
                while end < len(content) and content[end] in "; \n":
                    end += 1
                return array_start, end
        i += 1

    raise RuntimeError("WingTagMap 数组未正确闭合")


def update_types_file(new_json: str) -> None:
    """替换 src/types.ts 中的 WingTagMap 定义。"""
    content = TYPES_FILE.read_text(encoding="utf-8")
    array_start, array_end = find_wing_tag_map_range(content)

    new_content = content[:array_start] + new_json + ";\n\n" + content[array_end:]
    TYPES_FILE.write_text(new_content, encoding="utf-8")

    print(f"✅ 已更新: {TYPES_FILE}")


def main() -> None:
    data = fetch_remote_wing_map()
    new_json = format_ts_json(data)
    update_types_file(new_json)
    print(f"\n🎉 同步完成！兜底 WingTagMap 现在包含 {len(data)} 条数据。")


if __name__ == "__main__":
    main()
