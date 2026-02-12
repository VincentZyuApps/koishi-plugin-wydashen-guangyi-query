#!/usr/bin/env python3
"""
测试脚本：从后端获取数据，调用 Go 渲染器生成图片

开发环境信息:
  - Go 版本: go1.25.6 linux/amd64
  - Python 版本: 3.10+

用法:
  python test.py              # 使用默认角色ID
  python test.py 123456789    # 指定角色ID
  python test.py --no-open    # 不自动打开图片
"""

import base64
import json
import os
import platform
import subprocess
import sys
import urllib.request
from pathlib import Path

# 配置
BACKEND_URL = "http://sh-aliyun2.vincentzyu233.cn:51024"
WING_MAP_URL = "https://s.166.net/config/ds_yy_02/ma75_wing_wings.json"
DEFAULT_ROLE_ID = "338151163"

# 路径
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
BIN_DIR = PROJECT_ROOT / "bin"
TMP_DIR = PROJECT_ROOT / "tmp"

# 颜色输出
class Colors:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    BLUE = "\033[0;34m"
    NC = "\033[0m"  # No Color

    @classmethod
    def disable(cls):
        """Windows 不支持 ANSI 颜色时禁用"""
        cls.RED = cls.GREEN = cls.YELLOW = cls.BLUE = cls.NC = ""


# Windows 下禁用颜色（除非支持）
if platform.system() == "Windows":
    try:
        os.system("")  # 启用 ANSI 支持
    except:
        Colors.disable()


def log_info(msg: str):
    print(f"{Colors.BLUE}[INFO]{Colors.NC} {msg}")


def log_success(msg: str):
    print(f"{Colors.GREEN}[OK]{Colors.NC} {msg}")


def log_warn(msg: str):
    print(f"{Colors.YELLOW}[WARN]{Colors.NC} {msg}")


def log_error(msg: str):
    print(f"{Colors.RED}[ERROR]{Colors.NC} {msg}")


def get_binary_path() -> Path:
    """获取当前平台的二进制文件路径"""
    system = platform.system().lower()
    arch = platform.machine().lower()

    # 映射架构名
    if arch in ("x86_64", "amd64"):
        arch = "amd64"
    elif arch in ("arm64", "aarch64"):
        arch = "arm64"

    # 映射系统名
    if system == "windows":
        suffix = "-windows-amd64.exe"
    elif system == "darwin":
        suffix = f"-darwin-{arch}"
    else:
        suffix = f"-linux-{arch}"

    # 查找匹配的二进制文件
    pattern = f"wing-renderer{suffix}*"
    matches = list(BIN_DIR.glob(pattern))
    
    if matches:
        # 返回找到的第一个（可能带版本号）
        return matches[0]
    
    # 回退到不带版本号的名称
    return BIN_DIR / f"wing-renderer{suffix}"


def http_get(url: str) -> str:
    """HTTP GET 请求"""
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8")


def build_binary():
    """编译二进制文件"""
    log_info("编译 Go 渲染器...")
    
    # 尝试使用 make
    try:
        subprocess.run(["make", "build"], cwd=SCRIPT_DIR, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    
    # 尝试使用 go build
    try:
        subprocess.run(["go", "build", "-o", str(BIN_DIR / "wing-renderer"), "."], 
                      cwd=SCRIPT_DIR, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def run_renderer(binary_path: Path, input_json: str) -> dict:
    """调用 Go 渲染器"""
    process = subprocess.Popen(
        [str(binary_path)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    
    stdout, stderr = process.communicate(input=input_json.encode("utf-8"))
    
    if process.returncode != 0:
        raise RuntimeError(f"渲染器退出码: {process.returncode}, stderr: {stderr.decode()}")
    
    return json.loads(stdout.decode("utf-8"))


def open_file(file_path: Path):
    """跨平台打开文件"""
    system = platform.system()
    try:
        if system == "Darwin":  # macOS
            subprocess.Popen(["open", str(file_path)])
        elif system == "Windows":
            os.startfile(str(file_path))
        else:  # Linux
            subprocess.Popen(["xdg-open", str(file_path)], 
                           stdout=subprocess.DEVNULL, 
                           stderr=subprocess.DEVNULL)
    except Exception as e:
        log_warn(f"无法打开文件: {e}")


def main():
    # 解析参数
    args = sys.argv[1:]
    role_id = DEFAULT_ROLE_ID
    auto_open = True
    
    for arg in args:
        if arg == "--no-open":
            auto_open = False
        elif arg.isdigit():
            role_id = arg
    
    # 确保目录存在
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    
    # 检查二进制
    binary_path = get_binary_path()
    if not binary_path.exists():
        log_warn(f"二进制文件不存在: {binary_path}")
        if not build_binary():
            log_error("编译失败，请手动编译")
            return 1
        binary_path = get_binary_path()
    
    log_info(f"使用二进制: {binary_path.name}")
    
    # 1. 获取后端数据
    log_info(f"🔍 查询角色 {role_id} 的光翼数据...")
    
    try:
        api_response = http_get(f"{BACKEND_URL}/queryGuangyi?id={role_id}")
        response_data = json.loads(api_response)
    except Exception as e:
        log_error(f"后端请求失败: {e}")
        return 1
    
    if not response_data.get("success"):
        log_error(f"后端返回错误: {response_data.get('result', '未知错误')}")
        return 1
    
    log_success("获取到后端响应")
    
    # 2. 提取 wing_buffs
    try:
        result_str = response_data["data"]["result"]
        result_data = json.loads(result_str)
        wing_buffs = result_data["wing_buffs"]
    except (KeyError, json.JSONDecodeError) as e:
        log_error(f"无法解析 wing_buffs: {e}")
        return 1
    
    log_success(f"获取到 {len(wing_buffs)} 个光翼数据")
    
    # 3. 获取光翼映射表
    wing_map_file = TMP_DIR / "wing_map.json"
    if wing_map_file.exists():
        log_info("📂 使用本地缓存的映射表")
        with open(wing_map_file, "r", encoding="utf-8") as f:
            wing_map = json.load(f)
    else:
        log_info("📥 下载光翼映射表...")
        try:
            wing_map_str = http_get(WING_MAP_URL)
            wing_map = json.loads(wing_map_str)
            with open(wing_map_file, "w", encoding="utf-8") as f:
                f.write(wing_map_str)
            log_success(f"映射表已保存到 {wing_map_file}")
        except Exception as e:
            log_error(f"下载映射表失败: {e}")
            return 1
    
    # 4. 构造渲染输入
    log_info("📦 构造渲染输入...")
    
    render_input = {
        "roleId": role_id,
        "wingBuffs": wing_buffs,
        "wingMap": wing_map,
        "config": {
            "separateByCategory": True,
            "containerWidth": 1200,
            "outputFormat": "png",
        },
    }
    
    # 保存输入 JSON（调试用）
    input_file = TMP_DIR / "render_input.json"
    with open(input_file, "w", encoding="utf-8") as f:
        json.dump(render_input, f, ensure_ascii=False, indent=2)
    log_success(f"渲染输入已保存到 {input_file}")
    
    # 5. 调用渲染器
    log_info("🎨 调用 Go 渲染器...")
    
    try:
        render_output = run_renderer(binary_path, json.dumps(render_input))
    except Exception as e:
        log_error(f"渲染器调用失败: {e}")
        return 1
    
    if not render_output.get("success"):
        log_error(f"渲染失败: {render_output.get('error', '未知错误')}")
        return 1
    
    # 6. 保存图片
    log_info("💾 保存图片...")
    
    base64_data = render_output["data"]
    image_data = base64.b64decode(base64_data)
    
    output_file = TMP_DIR / f"wing_query_{role_id}.png"
    with open(output_file, "wb") as f:
        f.write(image_data)
    
    # 显示文件信息
    size_kb = output_file.stat().st_size / 1024
    log_success(f"✅ 图片已保存到: {output_file} ({size_kb:.1f} KB)")
    
    # 打开图片
    if auto_open:
        log_info("🖼️ 打开图片预览...")
        open_file(output_file)
    
    log_success("🎉 测试完成!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
