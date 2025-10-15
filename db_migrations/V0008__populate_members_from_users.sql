INSERT INTO members (name, role, status, avatar)
SELECT display_name, role, 'online', avatar 
FROM users 
WHERE display_name NOT IN (SELECT name FROM members);