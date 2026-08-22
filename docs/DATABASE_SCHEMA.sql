-- =============================================================================
-- AI-Powered Personalized Learning Path Generator — PostgreSQL Schema
-- Group BCC06 · Week 3 Sprint · Task 3.2
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'student',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT ck_users_role CHECK (role IN ('student', 'instructor', 'admin'))
);

-- -----------------------------------------------------------------------------
-- courses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    user_id         UUID NOT NULL,
    code            VARCHAR(50)  NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_courses_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_courses_user_code UNIQUE (user_id, code)
);

CREATE INDEX IF NOT EXISTS ix_courses_user_id ON courses(user_id);

-- -----------------------------------------------------------------------------
-- resources
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL,
    file_name       VARCHAR(500) NOT NULL,
    file_type       VARCHAR(20)  NOT NULL,
    resource_type   VARCHAR(20)  NOT NULL DEFAULT 'notes',
    storage_url     TEXT NOT NULL,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_resources_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT ck_resources_file_type CHECK (file_type IN ('pdf', 'pptx', 'docx')),
    CONSTRAINT ck_resources_resource_type CHECK (resource_type IN ('syllabus', 'pyq', 'notes', 'ppt')),
    CONSTRAINT ck_resources_processing_status CHECK (processing_status IN ('pending', 'processing', 'indexed', 'failed'))
);

CREATE INDEX IF NOT EXISTS ix_resources_course_id ON resources(course_id);

-- -----------------------------------------------------------------------------
-- concepts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS concepts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    unit_number     INTEGER NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_concepts_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uq_concepts_course_title UNIQUE (course_id, title),
    CONSTRAINT ck_concepts_unit_number CHECK (unit_number >= 1)
);

CREATE INDEX IF NOT EXISTS ix_concepts_course_id ON concepts(course_id);
CREATE INDEX IF NOT EXISTS ix_concepts_course_unit ON concepts(course_id, unit_number);

-- -----------------------------------------------------------------------------
-- student_knowledge_profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_knowledge_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    concept_id      UUID NOT NULL,
    mastery_score   NUMERIC(3, 2) NOT NULL DEFAULT 0.0,
    last_assessed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_skp_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_skp_concept
        FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
    CONSTRAINT uq_skp_user_concept UNIQUE (user_id, concept_id),
    CONSTRAINT ck_skp_mastery_score_range CHECK (mastery_score >= 0.0 AND mastery_score <= 1.0)
);

CREATE INDEX IF NOT EXISTS ix_skp_user_id ON student_knowledge_profiles(user_id);
CREATE INDEX IF NOT EXISTS ix_skp_concept_id ON student_knowledge_profiles(concept_id);
-- Speeds up the Gap Detector's "weak concepts for this user" scan.
CREATE INDEX IF NOT EXISTS ix_skp_user_mastery ON student_knowledge_profiles(user_id, mastery_score);
