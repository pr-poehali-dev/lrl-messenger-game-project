import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: WebRTC signaling server for voice chat
    Args: event with httpMethod, body, queryStringParameters
    Returns: Manages voice channel connections and WebRTC signaling
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Session-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            action = event.get('queryStringParameters', {}).get('action', 'list')
            
            if action == 'list':
                cur.execute('''
                    UPDATE voice_connections 
                    SET disconnected_at = NOW() 
                    WHERE disconnected_at IS NULL 
                    AND connected_at < NOW() - INTERVAL '5 minutes'
                ''')
                conn.commit()
                
                cur.execute('SELECT id, name FROM voice_channels ORDER BY id')
                channels = cur.fetchall()
                
                result_channels = []
                for channel in channels:
                    cur.execute('SELECT COUNT(*) FROM voice_connections WHERE channel_id = %s AND disconnected_at IS NULL', (channel[0],))
                    user_count = cur.fetchone()[0]
                    
                    result_channels.append({
                        'id': channel[0],
                        'name': channel[1],
                        'users': user_count
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'channels': result_channels})
                }
            
            elif action == 'peers':
                channel_id = event.get('queryStringParameters', {}).get('channel_id')
                if not channel_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'channel_id required'})
                    }
                
                cur.execute('''
                    SELECT vc.peer_id, u.display_name, u.avatar 
                    FROM voice_connections vc
                    JOIN users u ON vc.user_id = u.id
                    WHERE vc.channel_id = %s AND vc.disconnected_at IS NULL
                ''', (channel_id,))
                peers = cur.fetchall()
                
                result_peers = [{'peer_id': p[0], 'name': p[1], 'avatar': p[2]} for p in peers]
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'peers': result_peers})
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'join':
                channel_id = body_data.get('channel_id')
                user_id = body_data.get('user_id')
                peer_id = body_data.get('peer_id')
                
                if not all([channel_id, user_id, peer_id]):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'channel_id, user_id, peer_id required'})
                    }
                
                cur.execute('''
                    INSERT INTO voice_connections (channel_id, user_id, peer_id, connected_at)
                    VALUES (%s, %s, %s, NOW())
                ''', (channel_id, user_id, peer_id))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True})
                }
            
            elif action == 'leave':
                peer_id = body_data.get('peer_id')
                
                if not peer_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'peer_id required'})
                    }
                
                cur.execute('''
                    UPDATE voice_connections 
                    SET disconnected_at = NOW() 
                    WHERE peer_id = %s AND disconnected_at IS NULL
                ''', (peer_id,))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({'success': True})
                }
            
            elif action == 'signal':
                from_peer = body_data.get('from_peer')
                to_peer = body_data.get('to_peer')
                signal = body_data.get('signal')
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'isBase64Encoded': False,
                    'body': json.dumps({
                        'success': True,
                        'from_peer': from_peer,
                        'to_peer': to_peer,
                        'signal': signal
                    })
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        cur.close()
        conn.close()