import uuid
from typing import Literal

from pydantic import BaseModel, Field

MAX_MESSAGE_CHARS = 2000
MAX_HISTORY_TURNS = 12


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=6000)


class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    history: list[ChatTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)
    # Optional: narrow the assistant to one course the user can access.
    course_id: uuid.UUID | None = None


class AssistantSource(BaseModel):
    resource_id: str
    file_name: str
    course_code: str


class AssistantResponse(BaseModel):
    answer: str
    in_scope: bool
    sources: list[AssistantSource]
