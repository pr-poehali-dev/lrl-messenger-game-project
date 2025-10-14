-- Clean up all active voice connections
UPDATE voice_connections SET disconnected_at = NOW() WHERE disconnected_at IS NULL;
