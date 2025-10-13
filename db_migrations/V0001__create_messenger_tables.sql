CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  author VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  content TEXT NOT NULL,
  role VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE voice_channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  users INT DEFAULT 0,
  active BOOLEAN DEFAULT FALSE
);

CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'offline',
  avatar VARCHAR(500)
);

CREATE TABLE schedule (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  time VARCHAR(10) NOT NULL,
  date VARCHAR(20) NOT NULL,
  description TEXT
);

CREATE INDEX idx_messages_created_at ON messages(created_at DESC);