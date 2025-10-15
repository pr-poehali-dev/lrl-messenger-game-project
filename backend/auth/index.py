import json
import os
import hashlib
import secrets
from typing import Dict, Any
import psycopg2

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_urlsafe(32)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: User authentication - register and login
    Args: event with httpMethod, body
    Returns: HTTP response with user data and token
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action', 'login')
    username = body_data.get('username', '')
    password = body_data.get('password', '')
    
    if not username or not password:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Username and password required'})
        }
    
    dsn = os.environ.get('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(dsn)
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Database connection failed'})
        }
    
    if action == 'register':
        display_name = body_data.get('display_name', username)
        role = body_data.get('role', 'Солдат')
        password_hash = hash_password(password)
        
        cur = conn.cursor()
        
        safe_username = username.replace("'", "''")
        cur.execute(f"SELECT id FROM users WHERE username = '{safe_username}'")
        if cur.fetchone():
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Username already exists'})
            }
        
        safe_display_name = display_name.replace("'", "''")
        safe_role = role.replace("'", "''")
        
        cur.execute(f'''
            INSERT INTO users (username, password_hash, display_name, role)
            VALUES ('{safe_username}', '{password_hash}', '{safe_display_name}', '{safe_role}')
            RETURNING id, username, display_name, role, avatar
        ''')
        user_row = cur.fetchone()
        user = {
            'id': user_row[0],
            'username': user_row[1],
            'display_name': user_row[2],
            'role': user_row[3],
            'avatar': user_row[4]
        }
        
        cur.execute(f'''
            INSERT INTO members (name, role, status, avatar)
            VALUES ('{display_name}', '{role}', 'online', '{user["avatar"]}')
        ''')
        
        conn.commit()
        cur.close()
        
        conn.close()
        
        token = generate_token()
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'user': user,
                'token': token
            })
        }
    
    if action == 'login':
        password_hash = hash_password(password)
        safe_username = username.replace("'", "''")
        
        cur = conn.cursor()
        cur.execute(f'''
            SELECT id, username, display_name, role, avatar
            FROM users
            WHERE username = '{safe_username}' AND password_hash = '{password_hash}'
        ''')
        user_row = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not user_row:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Invalid credentials'})
            }
        
        user = {
            'id': user_row[0],
            'username': user_row[1],
            'display_name': user_row[2],
            'role': user_row[3],
            'avatar': user_row[4]
        }
        
        token = generate_token()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'user': user,
                'token': token
            })
        }
    
    return {
        'statusCode': 400,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'})
    }