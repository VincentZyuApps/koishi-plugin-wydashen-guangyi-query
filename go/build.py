#!/usr/bin/env python3
"""
Go 渲染器多平台编译脚本

开发环境信息:
  - Go 版本: go1.25.6 linux/amd64
  - Python 版本: 3.10+

用法:
  python build.py          # 编译所有五种架构
  python build.py --clean  # 清理并编译

编译目标:
  - linux/amd64
  - linux/arm64
  - darwin/amd64
  - darwin/arm64
  - windows/amd64
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# 项目路径
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
BIN_DIR = PROJECT_ROOT / "bin"
PACKAGE_JSON = PROJECT_ROOT / "package.json"

# 编译目标架构
TARGETS = [
    {"goos": "linux",   "goarch": "amd64", "ext": ""},
    {"goos": "linux",   "goarch": "arm64", "ext": ""},
    {"goos": "darwin",  "goarch": "amd64", "ext": ""},
    {"goos": "darwin",  "goarch": "arm64", "ext": ""},
    {"goos": "windows", "goarch": "amd64", "ext": ".exe"},
]


def get_version() -> str:
    """从 package.json 读取版本号"""
    with open(PACKAGE_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    return f"v{data['version']}"


def get_git_commit() -> str:
    """获取 Git commit hash (前7位)"""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short=7", "HEAD"],
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def build_binary(goos: str, goarch: str, ext: str, version: str, build_time: str, git_commit: str) -> bool:
    """编译单个平台的二进制文件"""
    output_name = f"wing-renderer-{goos}-{goarch}-{version}{ext}"
    output_path = BIN_DIR / output_name
    
    ldflags = f"-s -w -X main.Version={version} -X main.BuildTime={build_time} -X main.GitCommit={git_commit}"
    
    env = os.environ.copy()
    env["GOOS"] = goos
    env["GOARCH"] = goarch
    env["CGO_ENABLED"] = "0"  # 静态编译，无需 CGO
    
    cmd = [
        "go", "build",
        "-ldflags", ldflags,
        "-o", str(output_path),
        ".",
    ]
    
    print(f"🔨 编译 {goos}/{goarch}...")
    
    try:
        subprocess.run(cmd, cwd=SCRIPT_DIR, env=env, check=True)
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"   ✅ {output_name} ({size_mb:.2f} MB)")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ❌ 编译失败: {e}")
        return False


def clean_bin_dir():
    """清理 bin 目录"""
    if BIN_DIR.exists():
        for f in BIN_DIR.glob("wing-renderer-*"):
            f.unlink()
        print("🧹 已清理旧的编译产物")


def main():
    # 解析参数
    if "--clean" in sys.argv:
        clean_bin_dir()
    
    # 确保 bin 目录存在
    BIN_DIR.mkdir(parents=True, exist_ok=True)
    
    # 获取构建信息
    version = get_version()
    build_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    git_commit = get_git_commit()
    
    print("=" * 50)
    print("Go 渲染器多平台编译")
    print("=" * 50)
    print(f"📦 版本: {version}")
    print(f"🕐 构建时间: {build_time}")
    print(f"📝 Git commit: {git_commit}")
    print(f"📂 输出目录: {BIN_DIR}")
    print("=" * 50)
    
    # 编译所有目标
    success_count = 0
    for target in TARGETS:
        if build_binary(
            goos=target["goos"],
            goarch=target["goarch"],
            ext=target["ext"],
            version=version,
            build_time=build_time,
            git_commit=git_commit,
        ):
            success_count += 1
    
    print("=" * 50)
    print(f"✅ 编译完成: {success_count}/{len(TARGETS)} 成功")
    
    if success_count == len(TARGETS):
        print("\n📦 所有编译产物:")
        for f in sorted(BIN_DIR.glob("wing-renderer-*")):
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"   {f.name} ({size_mb:.2f} MB)")
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
