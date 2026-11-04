/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Radio,
  Share2,
  Copy,
  Check,
  LogIn,
  LogOut,
  ExternalLink,
  Tv,
  Smartphone,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut, User } from '../firebase/config';
import { generateRoomCode } from '../firebase/roomSync';

interface LiveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  activeRoomId: string | null;
  isHost: boolean;
  onStartRoom: (roomId: string) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
  onLeaveRoom: () => void;
}

export const LiveRoomModal: React.FC<LiveRoomModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeRoomId,
  isHost,
  onStartRoom,
  onJoinRoom,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [customRoomInput, setCustomRoomInput] = useState<string>('');
  const [joinInput, setJoinInput] = useState<string>('');
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
  const shareableUrl = activeRoomId ? `${currentUrl}?room=${encodeURIComponent(activeRoomId)}` : '';

  const handleCopy = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSignIn = async () => {
    setErrorMsg(null);
    setIsBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User closed or cancelled the popup — harmless cancellation, not a system failure
        console.info('Google Sign-In popup closed by user.');
        setErrorMsg(null);
      } else if (code === 'auth/popup-blocked') {
        console.warn('Google Sign-In popup was blocked by browser.');
        setErrorMsg('Pop-up window was blocked by your browser. Please allow popups for this site and try again.');
      } else if (code === 'auth/unauthorized-domain') {
        console.warn('Firebase unauthorized domain:', window?.location?.hostname);
        setErrorMsg(`Domain ${window?.location?.hostname} is not authorized in Firebase Auth. Please verify Authorized Domains in Firebase console.`);
      } else {
        console.warn('Sign-In note:', err?.message || err);
        setErrorMsg(err?.message || 'Google Sign-In could not be completed.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const handleCreateRoom = async (codeToUse?: string) => {
    setErrorMsg(null);
    setIsBusy(true);
    try {
      const roomCode = (codeToUse || customRoomInput || generateRoomCode()).trim().toLowerCase();
      await onStartRoom(roomCode);
    } catch (err: any) {
      console.error('Create room error:', err);
      setErrorMsg(err?.message || 'Failed to initialize real-time room.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput.trim()) return;
    setErrorMsg(null);
    setIsBusy(true);
    try {
      await onJoinRoom(joinInput.trim().toLowerCase());
    } catch (err: any) {
      console.error('Join room error:', err);
      setErrorMsg(err?.message || 'Room not found or invalid.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-400 tracking-wide flex items-center gap-2">
                Real-Time Live Sync
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Firebase Cloud
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sync stage grid, scores, and twists across laptops, tablets & projectors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          {/* ACTIVE ROOM VIEW */}
          {activeRoomId ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-center relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  LIVE NOW
                </div>
                <div className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-1">
                  Active Room Code
                </div>
                <div className="text-3xl font-black tracking-wider text-emerald-300 font-mono">
                  {activeRoomId}
                </div>
                <div className="text-xs text-slate-300 mt-2 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Role: <span className="font-bold text-white">{isHost ? 'Event Host (Master Controller)' : 'Connected Device (Live Synced)'}</span>
                </div>
              </div>

              {/* Shareable Link Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Shareable Live Link</span>
                  <span className="text-slate-500 text-[11px] font-normal">Open on any screen or device</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg active:scale-95 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-950" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Multi-screen tips */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-2.5">
                  <Tv className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-200">Stage Projector</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Open link on big screen. Press fullscreen (F) for clean presentation!
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-200">MC / Co-Anchor Phone</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Walk the stage with your phone. Tap tiles and adjust scores instantly!
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <a
                  href={shareableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
                <button
                  onClick={onLeaveRoom}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-bold transition-colors"
                >
                  Disconnect Live Room
                </button>
              </div>
            </div>
          ) : (
            /* NO ACTIVE ROOM YET - HOST OR JOIN */
            <div className="space-y-6">
              {/* Host Section */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-800/30 border border-amber-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Host a Live Stage Room
                  </div>
                  {currentUser && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono truncate max-w-[120px]">
                        {currentUser.email || currentUser.displayName}
                      </span>
                      <button
                        onClick={handleSignOut}
                        title="Sign Out"
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {!currentUser ? (
                  <div className="text-center py-2 space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Sign in with Google to create a secure, verified live room for your event.
                    </p>
                    <button
                      onClick={handleSignIn}
                      disabled={isBusy}
                      className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      {isBusy ? 'Connecting to Google...' : 'Sign In with Google to Host'}
                    </button>
                    <p className="text-[11px] text-slate-400">
                      Joining an existing room on other screens does not require a sign-in.
                    </p>
                    {typeof window !== 'undefined' && window.location.hostname.endsWith('github.io') && (
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-300 text-left">
                        <span className="font-bold text-amber-300">GitHub Pages Host Tip:</span> To sign in as room host from GitHub Pages, verify that your domain (<code className="text-amber-200">{window.location.hostname}</code>) is added to your Firebase Console under Auth &rarr; Settings &rarr; Authorized Domains.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Optional: custom code (e.g. gala-2026)"
                        value={customRoomInput}
                        onChange={(e) => setCustomRoomInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        onClick={() => handleCreateRoom()}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        Create Room
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Join Section */}
              <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Share2 className="w-4 h-4 text-sky-400" />
                  Join an Existing Stage Room
                </div>
                <p className="text-xs text-slate-400">
                  Enter a room code shared by the MC to mirror the stage board in real time.
                </p>
                <form onSubmit={handleJoin} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter code (e.g. stage-4921)"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono focus:border-sky-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isBusy || !joinInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <span>Connect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>⚡ 0ms Firestore Realtime WebSockets</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
