import SimplePeer from 'simple-peer';

export interface VoiceChatOptions {
  channelId: number;
  userId: number;
  apiUrl: string;
  onPeerJoin?: (peerId: string, name: string) => void;
  onPeerLeave?: (peerId: string) => void;
  onError?: (error: Error) => void;
}

export class VoiceChat {
  private channelId: number;
  private userId: number;
  private apiUrl: string;
  private myPeerId: string;
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private localStream: MediaStream | null = null;
  private onPeerJoin?: (peerId: string, name: string) => void;
  private onPeerLeave?: (peerId: string) => void;
  private onError?: (error: Error) => void;
  private pollInterval: number | null = null;
  private connected: boolean = false;

  constructor(options: VoiceChatOptions) {
    this.channelId = options.channelId;
    this.userId = options.userId;
    this.apiUrl = options.apiUrl;
    this.myPeerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.onPeerJoin = options.onPeerJoin;
    this.onPeerLeave = options.onPeerLeave;
    this.onError = options.onError;
  }

  async connect(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          channel_id: this.channelId,
          user_id: this.userId,
          peer_id: this.myPeerId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to join voice channel');
      }

      this.connected = true;
      this.startPolling();
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  private async startPolling(): Promise<void> {
    const checkPeers = async () => {
      if (!this.connected) return;

      try {
        const response = await fetch(`${this.apiUrl}?action=peers&channel_id=${this.channelId}`);
        const data = await response.json();
        
        const currentPeerIds = new Set(data.peers.map((p: any) => p.peer_id));
        
        for (const [peerId] of this.peers) {
          if (!currentPeerIds.has(peerId)) {
            this.removePeer(peerId);
          }
        }
        
        for (const peer of data.peers) {
          if (peer.peer_id !== this.myPeerId && !this.peers.has(peer.peer_id)) {
            this.createPeer(peer.peer_id, true);
            this.onPeerJoin?.(peer.peer_id, peer.name);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    await checkPeers();
    this.pollInterval = window.setInterval(checkPeers, 3000);
  }

  private createPeer(peerId: string, initiator: boolean): void {
    if (!this.localStream) return;

    const peer = new SimplePeer({
      initiator,
      stream: this.localStream,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (signal) => {
      fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signal',
          from_peer: this.myPeerId,
          to_peer: peerId,
          signal
        })
      });
    });

    peer.on('stream', (remoteStream) => {
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.play();
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      this.removePeer(peerId);
    });

    this.peers.set(peerId, peer);
  }

  private removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.destroy();
      this.peers.delete(peerId);
      this.onPeerLeave?.(peerId);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    for (const [peerId, peer] of this.peers) {
      peer.destroy();
      this.peers.delete(peerId);
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          peer_id: this.myPeerId
        })
      });
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  }

  setMicrophoneEnabled(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  isMicrophoneEnabled(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    return audioTrack ? audioTrack.enabled : false;
  }

  getConnectedPeers(): string[] {
    return Array.from(this.peers.keys());
  }
}
