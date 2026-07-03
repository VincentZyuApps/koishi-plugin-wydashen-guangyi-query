#!/usr/bin/env python3
"""
同步光翼映射表

从网易官方远程 URL 拉取最新的光翼 ID 映射 JSON，
更新 src/const.ts 中 WingTagMap 的兜底数据，
并同步写入 assets/json/wingTagMap.json 作为包内默认运行时资源。

用法:
    python scripts/sync_wing_map.py
"""

import json
import urllib.request
from pathlib import Path

REMOTE_URL = "https://s.166.net/config/ds_yy_02/ma75_wing_wings.json"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONST_FILE = PROJECT_ROOT / "src" / "const.ts"
ASSET_JSON_FILE = PROJECT_ROOT / "assets" / "json" / "wingTagMap.json"

# 光翼名字前缀 → emoji
PREFIX_EMOJI = {
    "l": "🗺️",
    "s": "👻",
}

# 一级标签 → emoji
CATEGORY_EMOJI = {
    "暴风眼": "🌪️",
    "晨岛": "🌅",
    "禁阁": "🏛️",
    "暮土": "💀",
    "霞谷": "🌇",
    "雨林": "🌧️",
    "云野": "☁️",
    "复刻永久": "🔄",
    "普通永久": "⭐",
    "破晓季": "🌈",
    "狂欢船队": "🚢",
    "遇境": "🏠",
    "云巢": "🪺",
}

# 二级标签 → emoji
SUBCATEGORY_EMOJI = {
    "": "⬜",
    "重生门": "🚪",
    "预言季": "🔮",
    "魔法季": "🪄",
    "梦想季": "💭",
    "集结季": "🏕️",
    "圣岛季": "🏝️",
    "小王子季": "👑",
    "风行季": "🌬️",
    "潜海季": "🤿",
    "表演季": "🎭",
    "追忆季": "📜",
    "拾光季": "📸",
    "九色鹿季": "🦌",
    "姆明季": "🧸",
    "青鸟季": "🐦",
    "迁徙季": "🦅",
    "狂欢季": "🎉",
    "小黑屋": "🕳️",
}


def get_wing_emojis(name: str, cat: str, sub: str) -> tuple[str, str, str]:
    prefix = name[0] if name else ""
    return (
        PREFIX_EMOJI.get(prefix, "❓"),
        CATEGORY_EMOJI.get(cat, "❓"),
        SUBCATEGORY_EMOJI.get(sub, "❓"),
    )


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
      // No.1 🗺️ 🌪️ 🚪
      { "光翼名字": "...", "一级标签": "...", "二级标签": "..." },
    """
    lines = ["["]
    for i, item in enumerate(data, start=1):
        name = item["光翼名字"]
        cat = item["一级标签"]
        sub = item["二级标签"]
        prefix_emoji, cat_emoji, sub_emoji = get_wing_emojis(name, cat, sub)
        obj = f'{{ "光翼名字": "{name}", "一级标签": "{cat}", "二级标签": "{sub}" }},'
        lines.append(f"  // No.{i} {prefix_emoji} {cat_emoji} {sub_emoji}")
        lines.append(f"  {obj}")
    lines.append("]")
    return "\n".join(lines)


def find_wing_tag_map_range(content: str) -> tuple[int, int]:
    """找到 WingTagMap 数组在文件中的起止位置（起始为 '[' 的位置，结束为 '];' 或 '] as const;' 之后的位置）。"""
    prefix = "export const WingTagMap = "
    start = content.find(prefix)
    if start == -1:
        raise RuntimeError(f"未在 {CONST_FILE} 中找到 WingTagMap 定义")

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
                end = i + 1
                # 跳过可选的 "as const" 和尾部 ";"、空白/换行
                while end < len(content) and content[end].isspace():
                    end += 1
                if content[end : end + len("as const")] == "as const":
                    end += len("as const")
                    while end < len(content) and content[end].isspace():
                        end += 1
                if end < len(content) and content[end] == ";":
                    end += 1
                    while end < len(content) and content[end] in " \n":
                        end += 1
                return array_start, end
        i += 1

    raise RuntimeError("WingTagMap 数组未正确闭合")


def update_const_file(new_json: str) -> None:
    """替换 src/const.ts 中的 WingTagMap 定义。"""
    content = CONST_FILE.read_text(encoding="utf-8")
    array_start, array_end = find_wing_tag_map_range(content)

    new_content = (
        content[:array_start] + new_json + " as const;\n\n" + content[array_end:]
    )
    CONST_FILE.write_text(new_content, encoding="utf-8")

    print(f"✅ 已更新: {CONST_FILE}")


def update_asset_json(data: list[dict]) -> None:
    """更新 assets/json/wingTagMap.json 包内默认资源。"""
    ASSET_JSON_FILE.parent.mkdir(parents=True, exist_ok=True)
    ASSET_JSON_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"✅ 已更新: {ASSET_JSON_FILE}")


def main() -> None:
    data = fetch_remote_wing_map()
    new_json = format_ts_json(data)
    update_const_file(new_json)
    update_asset_json(data)
    print(f"\n🎉 同步完成！兜底 WingTagMap 和包内 JSON 现在包含 {len(data)} 条数据。")


if __name__ == "__main__":
    main()
