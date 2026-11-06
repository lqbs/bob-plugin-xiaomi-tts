import argparse
import base64
import os
from pathlib import Path

from openai import OpenAI


STYLE_PROMPT = (
    "Read the English text clearly and accurately for an English learner. "
    "Use a neutral tone and a slightly slow, steady pace. "
    "Pronounce each word naturally, and read the supplied text exactly once "
    "without adding explanations or other words."
)


def main():
    parser = argparse.ArgumentParser(description="朗读英文单词或短句")
    parser.add_argument("text", help="要朗读的英文单词或短句")
    parser.add_argument("--voice", choices=("Mia", "Chloe", "Milo", "Dean"),
                        default="Mia", help="英文预置音色（默认：Mia）")
    parser.add_argument("-o", "--output", type=Path, default=Path("audio_file.wav"),
                        help="输出 WAV 文件路径（默认：audio_file.wav）")
    args = parser.parse_args()
    if not args.text.strip():
        parser.error("朗读文本不能为空")
    if not os.environ.get("MIMO_API_KEY"):
        parser.error("请先设置 MIMO_API_KEY 环境变量")

    client = OpenAI(
        api_key=os.environ["MIMO_API_KEY"],
        base_url="https://api.xiaomimimo.com/v1",
    )
    completion = client.chat.completions.create(
        model="mimo-v2.5-tts",
        messages=[
            {"role": "user", "content": STYLE_PROMPT},
            {"role": "assistant", "content": args.text},
        ],
        audio={"format": "wav", "voice": args.voice},
    )
    message = completion.choices[0].message
    if not message.audio or not message.audio.data:
        raise RuntimeError("服务器未返回音频数据")
    args.output.write_bytes(base64.b64decode(message.audio.data, validate=True))
    print(f"已保存：{args.output}")


if __name__ == "__main__":
    main()
