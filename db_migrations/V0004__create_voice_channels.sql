-- Create voice channels table
CREATE TABLE IF NOT EXISTS voice_channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create voice connections table
CREATE TABLE IF NOT EXISTS voice_connections (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES voice_channels(id),
    user_id INTEGER NOT NULL,
    peer_id VARCHAR(255) NOT NULL,
    connected_at TIMESTAMP DEFAULT NOW(),
    disconnected_at TIMESTAMP
);

-- Insert default voice channels
INSERT INTO voice_channels (name) VALUES 
    ('Главный штаб'),
    ('Тренировочный полигон'),
    ('Оперативная связь')
ON CONFLICT DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_voice_connections_channel ON voice_connections(channel_id);
CREATE INDEX IF NOT EXISTS idx_voice_connections_peer ON voice_connections(peer_id);
