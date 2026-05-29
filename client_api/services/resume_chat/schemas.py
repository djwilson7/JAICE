from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


ResumeChatIntent = Literal["conversation", "analysis", "tailor_suggestions"]
LLMRole = Literal["user", "assistant"]


class LLMMessage(BaseModel):
    role: LLMRole
    content: str


class LLMResponse(BaseModel):
    text: str
    raw: Any = None


class ResumeChatHistoryMessage(BaseModel):
    sender: Literal["user", "assistant"]
    text: str


class ResumeChatRequest(BaseModel):
    message: str
    resume_data: dict[str, Any]
    history: list[ResumeChatHistoryMessage] = Field(default_factory=list)
    context: Optional[str] = None


class ResumeRewriteBulletInput(BaseModel):
    id: Optional[str] = None
    index: int
    text: str


class ResumeRewriteSectionRequest(BaseModel):
    target: Literal["summary", "experience"]
    summary_text: Optional[str] = None
    experience_id: Optional[str] = None
    role_title: Optional[str] = None
    company: Optional[str] = None
    bullets: list[ResumeRewriteBulletInput] = Field(default_factory=list)
    guidance: Optional[str] = None


class SummarySuggestion(BaseModel):
    current_text: str
    suggested_text: str
    reason: str


class ExperienceBulletSuggestion(BaseModel):
    experience_id: Optional[str] = None
    role_title: Optional[str] = None
    bullet_index: int
    current_text: str
    suggested_text: str
    reason: str


class TailorSuggestions(BaseModel):
    summary: list[SummarySuggestion] = Field(default_factory=list)
    experience_bullets: list[ExperienceBulletSuggestion] = Field(default_factory=list)


class ResumeAnalysis(BaseModel):
    match_score: int
    requirements: list[str] = Field(default_factory=list)
    overlap: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class ResumeChatResponse(BaseModel):
    intent: ResumeChatIntent
    assistant_message: str
    analysis: Optional[ResumeAnalysis] = None
    tailor_suggestions: Optional[TailorSuggestions] = None


class ResumeRewriteSectionResponse(BaseModel):
    assistant_message: str
    tailor_suggestions: TailorSuggestions


class ResumeRewriteStreamEvent(BaseModel):
    event: Literal["delta", "structured", "error", "done"]
    target: Optional[Literal["summary", "experience"]] = None
    bullet_index: Optional[int] = None
    text: Optional[str] = None
    assistant_message: Optional[str] = None
    tailor_suggestions: Optional[TailorSuggestions] = None
    message: Optional[str] = None


class ResumeChatStreamEvent(BaseModel):
    event: Literal["intent", "delta", "structured", "error", "done"]
    intent: Optional[ResumeChatIntent] = None
    text: Optional[str] = None
    analysis: Optional[ResumeAnalysis] = None
    tailor_suggestions: Optional[TailorSuggestions] = None
    message: Optional[str] = None
