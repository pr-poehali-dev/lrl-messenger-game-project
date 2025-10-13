INSERT INTO voice_channels (name, users, active) VALUES 
('Офицерский канал', 0, false),
('Ивенты и сражения', 0, false),
('Паб (отдых)', 0, false);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(100) DEFAULT 'Солдат',
  avatar VARCHAR(500) DEFAULT '/placeholder.svg',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);