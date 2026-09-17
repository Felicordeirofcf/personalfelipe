export const EXERCISE_VIDEO_MAP = {
  'supino reto com barra': 'https://www.youtube.com/watch?v=sqOw2Y68ecY',
  'supino inclinado com halteres': 'https://www.youtube.com/watch?v=0G2_XV7slIg',
  'crossover em pe': 'https://www.youtube.com/watch?v=taI4XduLpTk',
  'puxada na frente com barra': 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
  'remada curvada com barra': 'https://www.youtube.com/watch?v=vT2GjY_Umpw',
  'remada baixa na maquina': 'https://www.youtube.com/watch?v=GZbfZ033f74',
  'agachamento livre com barra': 'https://www.youtube.com/watch?v=bEv6CCg2BC8',
  'leg press 45': 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
  'cadeira extensora': 'https://www.youtube.com/watch?v=YyvSfVfb89U',
  'mesa flexora': 'https://www.youtube.com/watch?v=1Tq3QdYUuHs',
  'desenvolvimento com halteres': 'https://www.youtube.com/watch?v=qEwKCR5JCog',
  'elevacao lateral com halteres': 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
  'triceps na polia alta com corda': 'https://www.youtube.com/watch?v=vB5OHsJ3EME',
  'triceps frances com halteres': 'https://www.youtube.com/watch?v=-Vyt2QdS839',
  'rosca direta com barra': 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
  'rosca martelo com halteres': 'https://www.youtube.com/watch?v=zC3nLlEvin4',
} as const satisfies Record<string, string>;

const EXERCISE_VIDEO_ALIASES: Array<[string[], string]> = [
  [['supino reto', 'supino horizontal'], EXERCISE_VIDEO_MAP['supino reto com barra']],
  [['supino inclinado'], EXERCISE_VIDEO_MAP['supino inclinado com halteres']],
  [['crossover', 'crucifixo no cabo'], EXERCISE_VIDEO_MAP['crossover em pe']],
  [['puxada alta', 'puxada frontal', 'puxada na frente'], EXERCISE_VIDEO_MAP['puxada na frente com barra']],
  [['remada curvada', 'remada cavalinho'], EXERCISE_VIDEO_MAP['remada curvada com barra']],
  [['remada baixa'], EXERCISE_VIDEO_MAP['remada baixa na maquina']],
  [['agachamento livre', 'agachamento no smith'], EXERCISE_VIDEO_MAP['agachamento livre com barra']],
  [['leg press'], EXERCISE_VIDEO_MAP['leg press 45']],
  [['cadeira extensora'], EXERCISE_VIDEO_MAP['cadeira extensora']],
  [['mesa flexora', 'cadeira flexora'], EXERCISE_VIDEO_MAP['mesa flexora']],
  [['desenvolvimento com halteres', 'desenvolvimento sentado'], EXERCISE_VIDEO_MAP['desenvolvimento com halteres']],
  [['elevacao lateral'], EXERCISE_VIDEO_MAP['elevacao lateral com halteres']],
  [['triceps na polia', 'triceps corda'], EXERCISE_VIDEO_MAP['triceps na polia alta com corda']],
  [['triceps frances'], EXERCISE_VIDEO_MAP['triceps frances com halteres']],
  [['rosca direta'], EXERCISE_VIDEO_MAP['rosca direta com barra']],
  [['rosca martelo'], EXERCISE_VIDEO_MAP['rosca martelo com halteres']],
];

export function normalizeExerciseName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isYoutubeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function resolveExerciseVideoUrl(name: string, fallback?: string | null): string {
  const normalizedName = normalizeExerciseName(name || '');
  if (!normalizedName) return '';

  for (const [key, url] of Object.entries(EXERCISE_VIDEO_MAP)) {
    const normalizedKey = normalizeExerciseName(key);
    if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) return url;
  }

  for (const [aliases, url] of EXERCISE_VIDEO_ALIASES) {
    if (aliases.some((alias) => normalizedName.includes(normalizeExerciseName(alias)))) return url;
  }

  if (fallback && isYoutubeUrl(fallback)) return fallback;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`execucao correta ${normalizedName}`)}`;
}

export function attachExerciseVideos<T extends { splits: Array<{ exercises: Array<{ name: string; videoUrl?: string }> }> }>(plan: T): T {
  return {
    ...plan,
    splits: plan.splits.map((split) => ({
      ...split,
      exercises: split.exercises.map((exercise) => ({
        ...exercise,
        videoUrl: resolveExerciseVideoUrl(exercise.name, exercise.videoUrl),
      })),
    })),
  };
}
