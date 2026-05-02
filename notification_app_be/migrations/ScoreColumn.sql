ALTER TABLE notifications ADD COLUMN score DOUBLE PRECISION DEFAULT 0;

UPDATE notifications SET score = 
  CASE notification_type
    WHEN 'Placement' THEN 3
    WHEN 'Result' THEN 2
    WHEN 'Event' THEN 1
    ELSE 0
  END
  + (1.0 / (EXTRACT(EPOCH FROM (now() - created_at))/3600 + 1));

CREATE INDEX idx_notifications_student_score ON notifications (student_id, score DESC);
