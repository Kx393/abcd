/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './config';
import { GamePack } from '../data/defaultPacks';
import { TileData, Team } from '../game/twistRules';

export interface GameRoomData {
  roomId: string;
  hostId: string;
  hostEmail?: string;
  gameState: 'title' | 'playing' | 'gameover';
  currentPack: GamePack;
  tiles: TileData[];
  teams: Team[];
  activeTeamIndex: number;
  lastAction?: string;
  updatedAt: string;
  createdAt?: string;
}

/**
 * Generate a concise, memorable room code for live stage events (e.g. stage-4921)
 */
export function generateRoomCode(): string {
  const words = ['stage', 'matrix', 'show', 'gala', 'arena', 'spot', 'anchor'];
  const prefix = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

/**
 * Get room code from URL params
 */
export function getRoomCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('room');
  if (code && /^[a-zA-Z0-9_\-]+$/.test(code.trim())) {
    return code.trim();
  }
  return null;
}

/**
 * Update browser URL with room code without page reload
 */
export function setRoomCodeInUrl(roomCode: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (roomCode) {
    url.searchParams.set('room', roomCode);
  } else {
    url.searchParams.delete('room');
  }
  window.history.replaceState({}, '', url.toString());
}

/**
 * Fetch a room once
 */
export async function fetchRoomDocument(roomId: string): Promise<GameRoomData | null> {
  const path = `rooms/${roomId}`;
  try {
    const snap = await getDoc(doc(db, 'rooms', roomId));
    if (snap.exists()) {
      return snap.data() as GameRoomData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/**
 * Create or initialize a room in Firestore
 */
export async function createRoomDocument(
  roomId: string,
  initialState: {
    gameState: 'title' | 'playing' | 'gameover';
    currentPack: GamePack;
    tiles: TileData[];
    teams: Team[];
    activeTeamIndex: number;
    lastAction?: string;
  }
): Promise<GameRoomData> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in with Google to host and create a live room.');
  }

  const path = `rooms/${roomId}`;
  const now = new Date().toISOString();

  const roomData: GameRoomData = {
    roomId,
    hostId: currentUser.uid,
    hostEmail: currentUser.email || undefined,
    gameState: initialState.gameState,
    currentPack: initialState.currentPack,
    tiles: initialState.tiles,
    teams: initialState.teams,
    activeTeamIndex: initialState.activeTeamIndex,
    lastAction: initialState.lastAction || 'Room created by host',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'rooms', roomId), roomData);
    return roomData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Broadcast game state updates to all connected devices in the room
 */
export async function pushRoomUpdate(
  roomId: string,
  state: {
    gameState: 'title' | 'playing' | 'gameover';
    currentPack: GamePack;
    tiles: TileData[];
    teams: Team[];
    activeTeamIndex: number;
    lastAction?: string;
  },
  existingRoom: GameRoomData
): Promise<void> {
  const path = `rooms/${roomId}`;
  const now = new Date().toISOString();

  const payload: GameRoomData = {
    roomId,
    hostId: existingRoom.hostId,
    hostEmail: existingRoom.hostEmail,
    gameState: state.gameState,
    currentPack: state.currentPack,
    tiles: state.tiles,
    teams: state.teams,
    activeTeamIndex: state.activeTeamIndex,
    lastAction: state.lastAction || existingRoom.lastAction || 'Live state updated',
    updatedAt: now,
    createdAt: existingRoom.createdAt || now,
  };

  try {
    await setDoc(doc(db, 'rooms', roomId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Subscribe to real-time updates for a room
 */
export function subscribeToRoom(
  roomId: string,
  onData: (data: GameRoomData) => void,
  onError?: (error: Error) => void
): () => void {
  const path = `rooms/${roomId}`;

  const unsubscribe = onSnapshot(
    doc(db, 'rooms', roomId),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameRoomData;
        onData(data);
      }
    },
    (err) => {
      console.warn('Realtime room subscription error:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );

  return unsubscribe;
}
