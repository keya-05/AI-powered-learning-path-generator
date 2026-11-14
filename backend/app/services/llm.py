"""Shared Anthropic client and response helpers for the AI features."""

import json
from functools import lru_cache

import anthropic

from app.core.config import get_settings


class AIUnavailable(Exception):
    """An AI feature can't run right now (not configured, or the API failed)."""


@lru_cache
def client() -> anthropic.Anthropic:
    settings = get_settings()
    if settings.anthropic_api_key:
        return anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return anthropic.Anthropic()


def reply_json(response) -> dict:
    # With server-side fallbacks the content can hold a `fallback` block; the
    # final answer is the text written after the last one.
    text = ""
    for block in response.content:
        if block.type == "fallback":
            text = ""
        elif block.type == "text":
            text += block.text
    return json.loads(text)


def structured_call(*, system: str, user: str, schema: dict, effort: str = "medium", max_tokens: int = 16000) -> dict:
    """One structured-output request; returns the parsed JSON or raises AIUnavailable.

    The answering model is logged per call (fallbacks can route elsewhere), as
    Sec. III-G of the paper requires for evaluation runs.
    """
    import logging

    log = logging.getLogger(__name__)
    settings = get_settings()
    unconfigured = "AI features aren't configured. Set ANTHROPIC_API_KEY in backend/.env."
    try:
        response = client().beta.messages.create(
            model=settings.assistant_model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError as error:
        raise AIUnavailable(unconfigured) from error
    except anthropic.RateLimitError as error:
        raise AIUnavailable("The AI service is busy right now. Try again in a minute.") from error
    except (anthropic.APIStatusError, anthropic.APIConnectionError) as error:
        raise AIUnavailable("The AI service couldn't be reached.") from error
    except TypeError as error:
        # The SDK raises TypeError when it can't find any credentials.
        raise AIUnavailable(unconfigured) from error

    log.info("LLM call answered by %s (stop_reason=%s)", response.model, response.stop_reason)
    if response.stop_reason == "refusal":
        raise AIUnavailable("The model declined this request.")
    if response.stop_reason == "max_tokens":
        raise AIUnavailable("The model's reply ran too long.")
    try:
        return reply_json(response)
    except ValueError as error:
        raise AIUnavailable("The model gave an unreadable reply.") from error
