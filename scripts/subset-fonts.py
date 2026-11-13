# -*- coding: utf-8 -*-
"""
把本机 Noto Serif SC 可变字体按作品实际用到的字做子集，输出 woff2 进 src/assets/。

为什么不用系统字体：作品要在评委会那台机器上也是这个样子。系统有没有思源宋体、
装的是哪个版本，都不该改变第一眼。字体本身是 OFL，随包分发没问题。
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "chaoyuan-serif.woff2"
SOURCE = Path(r"C:\Windows\Fonts\NotoSerifSC-VF.ttf")

# 除了正文里的字，还要 ASCII、常用标点与几个备用字（数字、序数、印章）
BASIC = "0123456789 .,:;!?()-—/×"
PUNCT = "　·—…「」『』《》（）【】、。，；：？！“”‘’–%°×÷±≈·"
SPARE = "零一二三四五六七八九十百千万第势式重来再遍收功炁云山谷顶金殿"

SOURCES = [ROOT / "index.html", *sorted((ROOT / "src").glob("*.ts"))]


def collect() -> str:
    chars = set(BASIC + PUNCT + SPARE)
    for path in SOURCES:
        chars.update(path.read_text(encoding="utf-8"))
    # 去掉控制字符与空白之外没用的东西
    chars = {c for c in chars if c.isprintable() or c == " "}
    chars.discard("\\")
    return "".join(sorted(chars))


def main() -> int:
    if not SOURCE.exists():
        print(f"找不到字体 {SOURCE}", file=sys.stderr)
        return 1
    text = collect()
    print(f"字符数 {len(text)}")

    font = TTFont(SOURCE)
    # 固定一个字重：中文标题靠字号与墨色分层，不靠假粗
    font = instantiateVariableFont(font, {"wght": 450}, inplace=True)

    options = subset.Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.layout_features = ["kern", "liga", "vert", "vrt2"]
    options.name_IDs = ["*"]
    options.notdef_outline = True

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(OUT)
    size = OUT.stat().st_size
    print(f"{OUT.relative_to(ROOT)}  {size / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
