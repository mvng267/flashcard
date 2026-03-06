from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import get_settings


def generate_hint(
    *,
    question_type: str,
    question_text: str,
    prompt_text: str,
    options: list[str] | None = None,
    answer_mask: str | None = None,
    user_answer: str | None = None,
) -> tuple[str, str]:
    settings = get_settings()

    if not settings.openai_api_key:
        return (
            _fallback_hint(
                question_type=question_type,
                question_text=question_text,
                options=options or [],
                answer_mask=answer_mask,
                user_answer=user_answer,
            ),
            "fallback",
        )

    try:
        system_prompt = (
            "You are an English learning assistant. "
            "Provide a short Vietnamese hint for the learner without revealing the full final answer. "
            "Hint must be concise (<= 25 words), practical, and encouraging."
        )

        user_prompt = (
            f"Question type: {question_type}\n"
            f"Question text: {question_text}\n"
            f"Prompt: {prompt_text}\n"
            f"Options: {options or []}\n"
            f"Answer mask: {answer_mask or ''}\n"
            f"User answer: {user_answer or ''}\n"
            "Write one Vietnamese hint only."
        )

        endpoint = settings.ai_api_endpoint.strip().lstrip("/")
        url = f"{settings.ai_api_base_url.rstrip('/')}/{endpoint}"

        if endpoint.endswith("chat/completions"):
            payload = {
                "model": settings.openai_model,
                "stream": False,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": 80,
            }
        else:
            payload = {
                "model": settings.openai_model,
                "stream": False,
                "input": [
                    {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
                    {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
                ],
                "max_output_tokens": 80,
            }

        req = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with urlopen(req, timeout=12) as resp:
            body = json.loads(resp.read().decode("utf-8"))

        text = _extract_text(body)
        if text:
            return text, "ai"
    except (HTTPError, URLError, TimeoutError, ValueError, KeyError, json.JSONDecodeError):
        pass
    except Exception:
        pass

    return (
        _fallback_hint(
            question_type=question_type,
            question_text=question_text,
            options=options or [],
            answer_mask=answer_mask,
            user_answer=user_answer,
        ),
        "fallback",
    )


def _extract_text(body: dict) -> str:
    # OpenAI responses API
    text = (body.get("output_text") or "").strip()
    if text:
        return text

    outputs = body.get("output") or []
    for item in outputs:
        for content in item.get("content", []):
            candidate = content.get("text")
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()

    # Chat-completions compatible proxies (nhiều router dùng format này)
    choices = body.get("choices") or []
    for choice in choices:
        message = choice.get("message") or {}
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()

    return ""


def _fallback_hint(
    *,
    question_type: str,
    question_text: str,
    options: list[str],
    answer_mask: str | None,
    user_answer: str | None,
) -> str:
    _ = question_text

    if question_type == "multiple_choice":
        trimmed = [opt for opt in options if opt][:4]
        if len(trimmed) >= 2:
            return "Gợi ý: loại 2 đáp án lệch nghĩa rõ ràng trước, rồi so 2 đáp án còn lại theo ngữ cảnh từ tiếng Anh."
        return "Gợi ý: ưu tiên đáp án có nghĩa sát ngữ cảnh từ tiếng Anh nhất."

    mask_part = f" Mẫu chữ: {answer_mask}." if answer_mask else ""
    if user_answer:
        return f"Gợi ý: kiểm tra lại chính tả, số ký tự và chữ cái đầu/cuối của từ tiếng Anh.{mask_part}"
    return f"Gợi ý: bắt đầu từ chữ cái đầu/cuối rồi suy ra cụm nghĩa trung tâm.{mask_part}"
