/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert';

// Mock validator mirroring the Firestore isValidGameRoom and isValidId logic
function isValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

const ALLOWED_KEYS = [
  'roomId',
  'hostId',
  'hostEmail',
  'gameState',
  'currentPack',
  'tiles',
  'teams',
  'activeTeamIndex',
  'lastAction',
  'updatedAt',
  'createdAt',
];

const REQUIRED_KEYS = [
  'roomId',
  'hostId',
  'gameState',
  'tiles',
  'teams',
  'activeTeamIndex',
  'updatedAt',
];

function isValidGameRoomPayload(data: Record<string, any>): boolean {
  const keys = Object.keys(data);
  const hasAllRequired = REQUIRED_KEYS.every((k) => keys.includes(k));
  if (!hasAllRequired) return false;

  const hasOnlyAllowed = keys.every((k) => ALLOWED_KEYS.includes(k));
  if (!hasOnlyAllowed) return false;

  if (!isValidId(data.roomId)) return false;
  if (typeof data.hostId !== 'string' || data.hostId.length > 128) return false;
  if (data.hostEmail !== undefined && (typeof data.hostEmail !== 'string' || data.hostEmail.length > 128)) return false;
  if (!['title', 'playing', 'gameover'].includes(data.gameState)) return false;
  if (typeof data.activeTeamIndex !== 'number' || data.activeTeamIndex < 0 || data.activeTeamIndex > 100) return false;
  if (!Array.isArray(data.tiles) || data.tiles.length > 32) return false;
  if (!Array.isArray(data.teams) || data.teams.length > 32) return false;
  if (typeof data.updatedAt !== 'string' || data.updatedAt.length > 64) return false;
  if (data.lastAction !== undefined && (typeof data.lastAction !== 'string' || data.lastAction.length > 300)) return false;
  if (data.createdAt !== undefined && (typeof data.createdAt !== 'string' || data.createdAt.length > 64)) return false;

  return true;
}

test('Dirty Dozen Test Runner - Valid room payload passes', () => {
  const validRoom = {
    roomId: 'room-123',
    hostId: 'uid-host-1',
    hostEmail: 'host@example.com',
    gameState: 'playing',
    tiles: [],
    teams: [{ id: 'team-1', name: 'Alpha', score: 100, color: '#f59e0b' }],
    activeTeamIndex: 0,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  assert.strictEqual(isValidGameRoomPayload(validRoom), true);
});

test('Dirty Dozen Payload 1: Rejects shadow fields / prototype pollution', () => {
  const payload = {
    roomId: 'room-123',
    hostId: 'uid-1',
    gameState: 'playing',
    tiles: [],
    teams: [],
    activeTeamIndex: 0,
    updatedAt: new Date().toISOString(),
    isAdmin: true, // Malicious shadow field
  };
  assert.strictEqual(isValidGameRoomPayload(payload), false);
});

test('Dirty Dozen Payload 5: Rejects malicious / traversal roomId characters', () => {
  assert.strictEqual(isValidId('../admin/rooms'), false);
  assert.strictEqual(isValidId('room$#@!'), false);
  assert.strictEqual(isValidId('a'.repeat(65)), false);
  assert.strictEqual(isValidId('valid-room_123'), true);
});

test('Dirty Dozen Payload 6: Rejects illegal gameState', () => {
  const payload = {
    roomId: 'room-123',
    hostId: 'uid-1',
    gameState: 'hacked_god_mode',
    tiles: [],
    teams: [],
    activeTeamIndex: 0,
    updatedAt: new Date().toISOString(),
  };
  assert.strictEqual(isValidGameRoomPayload(payload), false);
});

test('Dirty Dozen Payload 7: Rejects unbounded tile arrays (Denial of Wallet)', () => {
  const payload = {
    roomId: 'room-123',
    hostId: 'uid-1',
    gameState: 'playing',
    tiles: new Array(50).fill({ id: 1 }),
    teams: [],
    activeTeamIndex: 0,
    updatedAt: new Date().toISOString(),
  };
  assert.strictEqual(isValidGameRoomPayload(payload), false);
});

test('Dirty Dozen Payload 10: Rejects negative activeTeamIndex', () => {
  const payload = {
    roomId: 'room-123',
    hostId: 'uid-1',
    gameState: 'playing',
    tiles: [],
    teams: [],
    activeTeamIndex: -5,
    updatedAt: new Date().toISOString(),
  };
  assert.strictEqual(isValidGameRoomPayload(payload), false);
});
