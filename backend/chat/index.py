import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Handle chat messages - get history, send new messages, delete messages (officers only)
    Args: event with httpMethod, body, queryStringParameters
    Returns: HTTP response with messages list or success status
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-User-Role',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    
    if method == 'GET':
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('''
                SELECT id, author, avatar, content, role, 
                       TO_CHAR(created_at, 'HH24:MI') as timestamp
                FROM messages 
                ORDER BY created_at ASC
            ''')
            messages = cur.fetchall()
        
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'messages': messages})
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        author = body_data.get('author', 'Unknown')
        content = body_data.get('content', '')
        role = body_data.get('role', 'Солдат')
        avatar = body_data.get('avatar', '/placeholder.svg')
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('''
                INSERT INTO messages (author, avatar, content, role)
                VALUES (%s, %s, %s, %s)
                RETURNING id, author, avatar, content, role,
                          TO_CHAR(created_at, 'HH24:MI') as timestamp
            ''', (author, avatar, content, role))
            new_message = cur.fetchone()
            conn.commit()
        
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'message': new_message})
        }
    
    if method == 'DELETE':
        headers = event.get('headers', {})
        user_role = headers.get('x-user-role', headers.get('X-User-Role', ''))
        
        if user_role != 'Офицер':
            return {
                'statusCode': 403,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Only officers can delete messages'})
            }
        
        params = event.get('queryStringParameters', {})
        message_id = params.get('message_id')
        
        if not message_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'message_id required'})
            }
        
        with conn.cursor() as cur:
            cur.execute('DELETE FROM messages WHERE id = %s', (message_id,))
            conn.commit()
        
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'success': True})
        }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }