export type Mode = 'single' | 'assign';

export type Participant = { id: string; name: string; token: string };
export type Outcome = { id: string; label: string };

export type DrawResult =
  | { mode: 'single'; winnerId: string }
  | { mode: 'assign'; assignments: Record<string, string> }; // participantId -> outcomeId

export type AnimationKind = 'card' | 'roulette' | 'ladder';
export type Step = 'setup' | 'reveal' | 'choose' | 'animate' | 'result';
