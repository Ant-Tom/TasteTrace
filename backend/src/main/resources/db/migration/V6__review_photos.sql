CREATE TABLE review_photos (
    id              BIGSERIAL PRIMARY KEY,
    review_id       BIGINT NOT NULL REFERENCES reviews (id) ON DELETE CASCADE,
    object_key      VARCHAR(512) NOT NULL,
    content_type    VARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_photos_review ON review_photos (review_id);
