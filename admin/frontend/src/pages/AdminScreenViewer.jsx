import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const safeJSON = (str, fb = []) => { try { return JSON.parse(str || '[]'); } catch { return fb; } };

// Admin-side WebRTC viewer (mirrors ScreenShareViewer from user side)
export function ScreenShareViewer({ sessionId, mode, onEnd, isAdmin = true }) {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const pollRef = useRef(null);
  const [status, setStatus] = useState('connecting');

  const stopAll = useCallback(() => {
    clearInterval(pollRef.current);
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    setStatus('ended');
  }, []);

  const pushSignal = useCallback(async (data) => {
    try { await api.patch(`/api/screen/admin/session/${sessionId}/signal`, data); } catch {}
  }, [sessionId]);

  const pollSignal = useCallback(async () => {
    try {
      const res = await api.get(`/api/screen/admin/session/${sessionId}/signal`);
      if (!res.data.success) return;
      const { status: sStatus, offer, iceCandidates } = res.data;

      if (sStatus === 'ended' || sStatus === 'denied') { stopAll(); onEnd?.(); return; }
      const pc = pcRef.current;
      if (!pc) return;

      if (offer && pc.remoteDescription === null) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await pushSignal({ answer });
      }
      if (iceCandidates?.length) {
        for (const c of iceCandidates) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
      }
    } catch {}
  }, [sessionId, stopAll, onEnd, pushSignal]);

  useEffect(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (videoRef.current && e.streams[0]) {
        videoRef.current.srcObject = e.streams[0];
        setStatus('streaming');
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) pushSignal({ iceCandidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus('ended'); onEnd?.();
      }
    };

    pollRef.current = setInterval(pollSignal, 1000);
    return () => stopAll();
  }, [sessionId, pushSignal, pollSignal, stopAll, onEnd]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#050508' }}>
      <div style={{ padding: '8px 16px', background: 'rgba(20,20,30,0.95)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: status === 'streaming' ? '#10b981' : status === 'connecting' ? '#f59e0b' : '#ef4444',
          boxShadow: status === 'streaming' ? '0 0 6px #10b981' : 'none',
        }} />
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          {status === 'streaming' ? 'Live Stream' : status === 'connecting' ? 'Connecting...' : 'Stream ended'}
        </span>
      </div>
      {status === 'connecting' && (
        <div style={{ position: 'absolute', inset: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(108,99,255,0.2)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
          <p style={{ color: '#9ca3af', fontSize: 13 }}>Waiting for user to share their screen...</p>
        </div>
      )}
      <video ref={videoRef} autoPlay playsInline style={{ flex: 1, width: '100%', objectFit: 'contain', background: '#000' }} />
    </div>
  );
}

export default ScreenShareViewer;
