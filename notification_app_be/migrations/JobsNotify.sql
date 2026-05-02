CREATE TYPE notification_type AS ENUM ('Placement','Event','Result');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id BIGINT NOT NULL,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  priority SMALLINT NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_student_createdat ON notifications (student_id, created_at DESC);
CREATE INDEX idx_notifications_student_unread_createdat ON notifications (student_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_type_createdat ON notifications (notification_type, created_at DESC);
CREATE INDEX idx_notifications_createdat ON notifications (created_at DESC);
CREATE INDEX idx_notifications_priority_createdat ON notifications (priority DESC, created_at DESC);

CREATE TABLE notify_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  batch_size INT NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE notify_job_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES notify_jobs(id),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
