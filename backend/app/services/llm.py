"""One structured-output call for every AI feature, on Gemini or Anthropic.

`generate_json` takes a system prompt, a conversation and a JSON schema, and
returns the parsed reply. LLM_PROVIDER in backend/.env picks the provider:
"gemini" (GEMINI_API_KEY, GEMINI_MODEL) or "anthropic" (ANTHROPIC_API_KEY,
ASSISTANT_MODEL). The answering model is logged for every call, because
Sec. III-G of the paper reports which model produced each result.
"""

import json
import logging
from functools import lru_cache

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class AIUnavailable(Exception):
    """An AI feature can't run right now (not configured, or the API failed)."""


class AIRefused(AIUnavailable):
    """The model declined the request (safety filter or refusal stop reason)."""


def provider() -> str:
    return get_settings().llm_provider.lower()


def model_name() -> str:
    settings = get_settings()
    return settings.gemini_model if provider() == "gemini" else settings.assistant_model


def _unconfigured() -> AIUnavailable:
    key = "GEMINI_API_KEY" if provider() == "gemini" else "ANTHROPIC_API_KEY"
    return AIUnavailable(f"AI features aren't configured. Set {key} in backend/.env.")


def generate_json(
    *,
    system: str,
    messages: list[dict] | str,
    schema: dict,
    effort: str = "medium",
    max_tokens: int = 16000,
) -> dict:
    """Return the model's JSON reply, or raise AIUnavailable / AIRefused.

    `messages` is a user prompt, or a list of {"role": "user"|"assistant",
    "content": str} starting with a user turn.
    """
    if isinstance(messages, str):
        messages = [{"role": "user", "content": messages}]
    if provider() == "gemini":
        text, answered_by = _gemini(system, messages, schema, max_tokens)
    else:
        text, answered_by = _anthropic(system, messages, schema, effort, max_tokens)
    logger.info("LLM call answered by %s", answered_by)
    try:
        return json.loads(text)
    except (TypeError, ValueError) as error:
        raise AIUnavailable("The model gave an unreadable reply. Try again.") from error


# --------------------------------------------------------------------------
# Gemini (google-genai)
# --------------------------------------------------------------------------


@lru_cache
def _gemini_client():
    from google import genai
    from google.genai import types

    key = get_settings().gemini_api_key
    if not key:
        raise _unconfigured()
    # Generous timeout: a 25-question paper can take a minute or two to write.
    return genai.Client(api_key=key, http_options=types.HttpOptions(timeout=180_000))


_GEMINI_BLOCKED = {"SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION"}


def _gemini(system: str, messages: list[dict], schema: dict, max_tokens: int) -> tuple[str, str]:
    from google.genai import errors, types

    settings = get_settings()
    contents = [
        types.Content(role="model" if m["role"] == "assistant" else "user", parts=[types.Part(text=m["content"])])
        for m in messages
    ]
    try:
        response = _gemini_client().models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                response_json_schema=schema,
                max_output_tokens=max_tokens,
            ),
        )
    except errors.ClientError as error:
        if error.code in (401, 403):
            raise _unconfigured() from error
        if error.code == 429:
            raise AIUnavailable("The AI service is busy right now. Try again in a minute.") from error
        logger.exception("Gemini rejected the request")
        raise AIUnavailable("The AI service rejected the request.") from error
    except (errors.ServerError, errors.APIError) as error:
        logger.exception("Gemini request failed")
        raise AIUnavailable("The AI service couldn't be reached. Try again shortly.") from error
    except Exception as error:  # network errors surface as httpx exceptions
        logger.exception("Gemini request failed")
        raise AIUnavailable("The AI service couldn't be reached. Try again shortly.") from error

    feedback = response.prompt_feedback
    if feedback is not None and feedback.block_reason:
        raise AIRefused("The model declined this request.")
    candidate = (response.candidates or [None])[0]
    reason = getattr(candidate, "finish_reason", None)
    reason_name = getattr(reason, "name", str(reason or ""))
    if reason_name in _GEMINI_BLOCKED:
        raise AIRefused("The model declined this request.")
    if reason_name == "MAX_TOKENS":
        raise AIUnavailable("The model's reply ran too long.")
    return response.text, response.model_version or settings.gemini_model


# --------------------------------------------------------------------------
# Anthropic
# --------------------------------------------------------------------------


@lru_cache
def _anthropic_client():
    import anthropic

    settings = get_settings()
    return anthropic.Anthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else anthropic.Anthropic()


def _anthropic(system: str, messages: list[dict], schema: dict, effort: str, max_tokens: int) -> tuple[str, str]:
    import anthropic

    settings = get_settings()
    try:
        response = _anthropic_client().beta.messages.create(
            model=settings.assistant_model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
            output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
            cache_control={"type": "ephemeral"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError as error:
        raise _unconfigured() from error
    except anthropic.RateLimitError as error:
        raise AIUnavailable("The AI service is busy right now. Try again in a minute.") from error
    except (anthropic.APIStatusError, anthropic.APIConnectionError) as error:
        logger.exception("Anthropic request failed")
        raise AIUnavailable("The AI service couldn't be reached. Try again shortly.") from error
    except TypeError as error:
        # The SDK raises TypeError when it can't find any credentials.
        raise _unconfigured() from error

    if response.stop_reason == "refusal":
        raise AIRefused("The model declined this request.")
    if response.stop_reason == "max_tokens":
        raise AIUnavailable("The model's reply ran too long.")
    # With server-side fallbacks the content can hold a `fallback` block; the
    # final answer is the text written after the last one.
    text = ""
    for block in response.content:
        if block.type == "fallback":
            text = ""
        elif block.type == "text":
            text += block.text
    return text, response.model


def structured_call(*, system: str, user: str, schema: dict, effort: str = "medium", max_tokens: int = 16000) -> dict:
    """Single-turn shorthand used by the graph builder."""
    return generate_json(system=system, messages=user, schema=schema, effort=effort, max_tokens=max_tokens)
