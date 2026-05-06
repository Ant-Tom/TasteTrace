from fastapi import FastAPI
from pydantic import BaseModel, Field


class ModeratePhotoRequest(BaseModel):
    photo_url: str = Field(..., description="S3 or public URL to review photo")


class ModeratePhotoResponse(BaseModel):
    accepted: bool
    reason: str
    confidence: float


app = FastAPI(title="TasteTrace AI Moderation Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/moderate-photo", response_model=ModeratePhotoResponse)
def moderate_photo(payload: ModeratePhotoRequest) -> ModeratePhotoResponse:
    _ = payload
    return ModeratePhotoResponse(
        accepted=True,
        reason="Stub classifier: accepted by default",
        confidence=0.51
    )
