CREATE TABLE IF NOT EXISTS templates (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  ratio VARCHAR(20) NOT NULL,
  image VARCHAR(500) NOT NULL,
  accent VARCHAR(20) NOT NULL,
  description VARCHAR(500) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS template_requirements (
  template_id VARCHAR(32) PRIMARY KEY,
  required_image_count INT NOT NULL DEFAULT 1,
  accepted_mime_types VARCHAR(255) NOT NULL,
  max_file_size_bytes BIGINT NOT NULL,
  CONSTRAINT fk_template_requirements_template
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS creation_tasks (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  template_id VARCHAR(32) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_image VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  source_path VARCHAR(1000) NOT NULL,
  result_path VARCHAR(1000),
  status VARCHAR(20) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  stage VARCHAR(100) NOT NULL,
  error_message VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tasks_user_created (user_id, created_at)
);
