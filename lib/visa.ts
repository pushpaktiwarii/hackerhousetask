/**
 * visa.ts — Deterministic "Visa Class" generator from name hash
 * Produces a unique visa class string like "CLASS: SHIP-1 (Multiple Entry Debugger)"
 */

const LEVELS = ['1', '2', '3', 'A', 'X'];
const CODES = [
  'SHIP', 'VIBE', 'HACK', 'BUILD', 'DEBUG', 'STACK', 'PROD', 'CODE',
  'SHIP', 'PUSH', 'MERGE', 'DEPLOY', 'GIT', 'SYNC', 'SYNC', 'API',
];
const DESCRIPTIONS = [
  'Multiple Entry Debugger',
  'Permanent Beach Resident',
  'Serial Side-Project Launcher',
  'Compulsive Repo Pusher',
  'Late-Night Deploy Specialist',
  'Full-Stack Vibe Engineer',
  'Open Source Beach Dweller',
  'Recursive Bug Hunter',
  'Type-Safe Sunset Chaser',
  'Infinite Loop Escaper',
  'Zero-Config Hermit',
  'Hot-Reload Nomad',
  'Async/Await Wanderer',
  'Runtime Error Wrangler',
  'Merge Conflict Mediator',
  'Ship-First Apologist',
];

function hashName(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

export function generateVisaClass(name: string): string {
  const h = hashName(name || 'BUILDER');
  const code = CODES[h % CODES.length];
  const level = LEVELS[(h >> 4) % LEVELS.length];
  const desc = DESCRIPTIONS[(h >> 8) % DESCRIPTIONS.length];
  return `CLASS: ${code}-${level} (${desc})`;
}
