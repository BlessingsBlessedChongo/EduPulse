-- The first tables. Every learner's rows hang off their own id, and deleting
-- a learner or a course removes everything beneath it.

CREATE TABLE learner (
    id            uuid PRIMARY KEY,
    email         text        NOT NULL UNIQUE,
    name          text        NOT NULL,
    password_hash text        NOT NULL,
    token_version integer     NOT NULL DEFAULT 0,
    is_demo       boolean     NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL
);

CREATE TABLE course (
    id         uuid PRIMARY KEY,
    user_id    uuid        NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    name       text        NOT NULL,
    exam_date  date,
    style_json jsonb,
    created_at timestamptz NOT NULL
);
CREATE INDEX course_by_user ON course (user_id);

CREATE TABLE document (
    id             uuid PRIMARY KEY,
    course_id      uuid        NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    kind           text        NOT NULL CHECK (kind IN ('Notes', 'PastPaper')),
    title          text        NOT NULL,
    status         text        NOT NULL CHECK (status IN ('Queued', 'Reading', 'Ready', 'Failed')),
    note           text,
    page_count     integer     NOT NULL DEFAULT 0,
    question_count integer     NOT NULL DEFAULT 0,
    proposed       integer     NOT NULL DEFAULT 0,
    not_on_page    integer     NOT NULL DEFAULT 0,
    upload        bytea,
    upload_type    text,
    created_at     timestamptz NOT NULL
);
CREATE INDEX document_by_course ON document (course_id);
CREATE INDEX document_waiting ON document (created_at) WHERE status IN ('Queued', 'Reading');

CREATE TABLE page (
    id          uuid PRIMARY KEY,
    document_id uuid    NOT NULL REFERENCES document (id) ON DELETE CASCADE,
    number      integer NOT NULL,
    text        text    NOT NULL,
    UNIQUE (document_id, number)
);

CREATE TABLE topic (
    id        uuid PRIMARY KEY,
    course_id uuid NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    name      text NOT NULL,
    UNIQUE (course_id, name)
);

CREATE TABLE question (
    id                uuid PRIMARY KEY,
    course_id         uuid        NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    topic_id          uuid        NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    document_id       uuid        NOT NULL REFERENCES document (id) ON DELETE CASCADE,
    page_number       integer     NOT NULL,
    kind              text        NOT NULL CHECK (kind IN ('Choice', 'Short', 'Maths', 'Blank')),
    prompt            text        NOT NULL,
    options_json      jsonb,
    answer            text        NOT NULL,
    answer_expression text,
    scheme_json       jsonb       NOT NULL,
    marks             integer     NOT NULL CHECK (marks > 0),
    source_quote      text        NOT NULL,
    made_by           text        NOT NULL,
    created_at        timestamptz NOT NULL
);
CREATE INDEX question_by_course ON question (course_id);

CREATE TABLE review (
    id            uuid PRIMARY KEY,
    user_id       uuid    NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    question_id   uuid    NOT NULL REFERENCES question (id) ON DELETE CASCADE,
    course_id     uuid    NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    topic_id      uuid    NOT NULL REFERENCES topic (id) ON DELETE CASCADE,
    due_on        date    NOT NULL,
    interval_days integer NOT NULL,
    streak        integer NOT NULL,
    lapses        integer NOT NULL,
    last_score    double precision NOT NULL,
    last_seen_on  date    NOT NULL,
    UNIQUE (user_id, question_id)
);
CREATE INDEX review_due ON review (user_id, due_on);

CREATE TABLE attempt (
    id           uuid PRIMARY KEY,
    user_id      uuid        NOT NULL REFERENCES learner (id) ON DELETE CASCADE,
    question_id  uuid        NOT NULL REFERENCES question (id) ON DELETE CASCADE,
    course_id    uuid        NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    response     text        NOT NULL,
    from_photo   boolean     NOT NULL,
    score        integer     NOT NULL,
    max_score    integer     NOT NULL,
    verdict_json jsonb       NOT NULL,
    marked_by    text        NOT NULL,
    disputed     boolean     NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL,
    CHECK (score >= 0 AND score <= max_score)
);
CREATE INDEX attempt_by_user_day ON attempt (user_id, created_at);

CREATE TABLE ai_call (
    id           uuid PRIMARY KEY,
    user_id      uuid,
    purpose      text        NOT NULL,
    model        text        NOT NULL,
    milliseconds integer     NOT NULL,
    succeeded    boolean     NOT NULL,
    had_image    boolean     NOT NULL,
    created_at   timestamptz NOT NULL
);
CREATE INDEX ai_call_by_day ON ai_call (created_at);
