-- Clean up test connection
UPDATE voice_connections SET disconnected_at = NOW() WHERE peer_id = 'test-peer-123';
