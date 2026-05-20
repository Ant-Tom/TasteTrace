CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE establishments (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    cuisine     VARCHAR(100) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL
);

CREATE TABLE reviews (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    establishment_id    BIGINT NOT NULL REFERENCES establishments (id) ON DELETE CASCADE,
    rating              SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text                TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_establishment ON reviews (establishment_id);
CREATE INDEX idx_reviews_user ON reviews (user_id);
CREATE INDEX idx_reviews_user_establishment ON reviews (user_id, establishment_id);
