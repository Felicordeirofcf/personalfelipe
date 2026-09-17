import OpenAI from 'openai';
import { env } from '../../lib/env';
import {
  ExerciseInput,
  SplitInput,
  WorkoutPlanInput,
  WorkoutPlanSchema,
} from './workout.schema';
import { attachExerciseVideos } from './exercise-videos';

export type AnamnesisForGeneration = {
  id: string;
  goal: string;
  experience: string;
  gender: 'MALE' | 'FEMALE';
  weeklyDays: number;
  injuries: string[];
  availableEquip: string;
  user: { id: string; name: string };
};

export type GenerationMode = 'mock' | 'openai';

export const METHODOLOGIES_CATALOG = {
  PPL: {
    name: 'Push / Pull / Legs (Hipertrofia Clássica Periodizada)',
    description: 'Foco nos padrões motores de empurrar, puxar e membros inferiores. Ênfase em sobrecarga progressiva, faixas 6-10 para compostos e 10-15 para isoladores.',
  },
  UPPER_LOWER: {
    name: 'Upper / Lower (Alta Frequência - Modelo Eric Helms / Schoenfeld)',
    description: 'Alternância de membros superiores e inferiores. Equilíbrio articular, densidade de treino e controle rigoroso de Repetições em Reserva (RIR).',
  },
  FST7: {
    name: 'Metodologia FST-7 (Fascia Stretch Training - Hany Rambod)',
    description: 'Exercícios base pesados finalizados com 7 séries de 10-12 reps e descanso curto (30-45s), visando expansão da fáscia muscular e pump intracelular máximo.',
  },
  HEAVY_DUTY: {
    name: 'Heavy Duty / Alta Intensidade (Inspirado em Mike Mentzer / Dorian Yates)',
    description: 'Baixo volume de séries efetivas (1 a 2 por exercício), intensidade máxima até a falha técnica (RIR 0) e ênfase na fase excêntrica lenta (cadência 3-0-1-0).',
  },
  DUP: {
    name: 'Periodização Ondulatória Diária (DUP - Zourdos & Poliquin)',
    description: 'Variação ondulada de estímulos na mesma semana: dias com foco em força tensional (4-6 reps) e dias de estresse metabólico elevado (12-15 reps).',
  },
  ANTAGONIST: {
    name: 'Antagonista / Agonista (Treinamento em Superset - Arnold Schwarzenegger)',
    description: 'Estímulo pareado de grupos opostos em sequência (Peito e Costas, Bíceps e Tríceps) para maximizar fluxo sanguíneo e eficiência neuromuscular.',
  },
} as const;

type MethodologyKey = keyof typeof METHODOLOGIES_CATALOG;
type TrainingMethodology = (typeof METHODOLOGIES_CATALOG)[MethodologyKey];

function selectTrainingMethodology(requested?: string): TrainingMethodology {
  const keys = Object.keys(METHODOLOGIES_CATALOG) as MethodologyKey[];
  if (requested && requested !== 'AUTO' && requested in METHODOLOGIES_CATALOG) {
    return METHODOLOGIES_CATALOG[requested as MethodologyKey];
  }
  const key = keys[Math.floor(Math.random() * keys.length)] ?? 'PPL';
  return METHODOLOGIES_CATALOG[key];
}

function applyMethodologyToMock(plan: WorkoutPlanInput, methodology: TrainingMethodology): WorkoutPlanInput {
  const labels = methodology.name.startsWith('Upper / Lower')
    ? ['Upper A — Empurrar e Tracionar', 'Lower A — Quadríceps e Posterior', 'Upper B — Costas e Braços', 'Lower B — Glúteos e Membros Inferiores']
    : methodology.name.startsWith('Antagonista')
      ? ['Peito + Costas — Superset Antagonista', 'Quadríceps + Posterior — Superset', 'Bíceps + Tríceps — Superset', 'Ombros + Core — Eficiência']
      : methodology.name.startsWith('Periodização')
        ? ['Força — Baixas Repetições', 'Hipertrofia — Tensão Mecânica', 'Metabólico — Alto Volume', 'Força Técnica — Variações']
        : methodology.name.startsWith('Heavy Duty')
          ? ['Alta Intensidade — Peito e Costas', 'Alta Intensidade — Pernas', 'Alta Intensidade — Ombros e Braços']
          : methodology.name.startsWith('FST-7')
            ? ['Base + FST-7 — Peito', 'Base + FST-7 — Costas', 'Base + FST-7 — Pernas', 'Base + FST-7 — Ombros']
            : ['Push — Empurrar', 'Pull — Tracionar', 'Legs — Membros Inferiores'];
  return {
    ...plan,
    splits: plan.splits.map((split, index) => ({
      ...split,
      name: labels[index % labels.length] ?? split.name,
      focus: `${split.focus} | Método: ${methodology.name}`.slice(0, 160),
    })),
  };
}

export class AiGenerationError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'AiGenerationError';
  }
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function hasSubacromialRestriction(injuries: string[]) {
  const text = normalize(injuries.join(' '));
  return (
    text.includes('subacromial') ||
    text.includes('ombro') ||
    text.includes('manguito') ||
    text.includes('supraespinal')
  );
}

function assertBiomechanicalSafety(plan: WorkoutPlanInput, injuries: string[]) {
  if (!hasSubacromialRestriction(injuries)) return;

  for (const split of plan.splits) {
    for (const exercise of split.exercises) {
      const name = normalize(exercise.name);
      const notes = normalize(exercise.notes ?? '');
      const isBehindNeckPress =
        name.includes('por tras') ||
        name.includes('behind the neck') ||
        name.includes('desenvolvimento posterior');
      const unrestrictedLateralRaise =
        name.includes('elevacao lateral') &&
        !notes.includes('90') &&
        !notes.includes('plano escapular');

      if (isBehindNeckPress || unrestrictedLateralRaise) {
        throw new AiGenerationError(
          `O exercício "${exercise.name}" viola a restrição informada para o ombro.`,
        );
      }
    }
  }
}

function exercise(
  name: string,
  sets: number,
  reps: string,
  rir: number,
  restSeconds: number,
  cadence: string,
  notes?: string,
): ExerciseInput {
  return { name, sets, reps, rir, restSeconds, cadence, ...(notes ? { notes } : {}) };
}

function buildFemaleMockWorkout(anamnesis: AnamnesisForGeneration): WorkoutPlanInput {
  const gym = normalize(anamnesis.availableEquip).includes('academia');
  const leg = (name: string, focus: string, items: ExerciseInput[]): SplitInput => ({ name, focus, exercises: items });
  const lowerA = leg('Dia 1 - Glúteos e Posterior', 'Ênfase em glúteos e cadeia posterior', [
    exercise(gym ? 'Hip thrust com barra' : 'Elevação pélvica', 4, '8-12', 1, 150, '2-1-1-1'),
    exercise(gym ? 'Búlgaro com tronco inclinado' : 'Afundo búlgaro', 3, '8-12', 2, 120, '3-0-1-0'),
    exercise(gym ? 'Stiff/RDL com barra' : 'Stiff unilateral', 4, '8-10', 2, 120, '3-1-1-0'),
    exercise(gym ? 'Mesa flexora' : 'Flexão de joelhos com toalha', 3, '10-15', 1, 75, '2-1-2-0'),
    exercise(gym ? 'Abdução na máquina' : 'Abdução com faixa', 3, '15-20', 1, 60, '2-1-2-1'),
  ]);
  const upper = leg('Dia 2 - Costas, Ombros e Tríceps', 'Postura e membros superiores com volume moderado', [
    exercise(gym ? 'Puxada alta frontal' : 'Puxada com elástico', 4, '8-12', 2, 120, '3-0-1-0'),
    exercise(gym ? 'Remada baixa' : 'Remada unilateral', 4, '8-12', 2, 120, '2-1-1-0'),
    exercise(gym ? 'Elevação lateral no plano escapular' : 'Elevação lateral com faixa', 3, '12-15', 1, 75, '2-0-1-1'),
    exercise(gym ? 'Face pull na polia' : 'Crucifixo inverso com faixa', 3, '12-15', 1, 75, '2-1-1-0'),
    exercise(gym ? 'Tríceps na polia com corda' : 'Tríceps com faixa', 3, '10-15', 1, 75, '2-0-2-0'),
  ]);
  const lowerB = leg('Dia 3 - Quadríceps e Glúteos', 'Quadríceps, glúteos e membros inferiores completos', [
    exercise(gym ? 'Leg press 45°' : 'Agachamento goblet', 4, '8-12', 2, 150, '3-0-1-0'),
    exercise(gym ? 'Agachamento no Smith' : 'Agachamento livre', 4, '8-10', 2, 150, '3-1-1-0'),
    exercise(gym ? 'Cadeira extensora' : 'Agachamento espanhol', 3, '10-15', 1, 75, '2-1-2-0'),
    exercise(gym ? 'Hip thrust na máquina' : 'Elevação pélvica', 3, '10-15', 1, 90, '2-1-1-1'),
    exercise(gym ? 'Abdução em máquina' : 'Abdução com faixa', 3, '15-20', 1, 60, '2-1-2-1'),
  ]);
  const templates = [lowerA, upper, lowerB];
  const splits = Array.from({ length: Math.min(Math.max(anamnesis.weeklyDays, 1), 6) }, (_, index) => templates[index % templates.length]);
  return WorkoutPlanSchema.parse({ splits, rationale: `Template feminino com ênfase em glúteos e membros inferiores para ${anamnesis.user.name}; costas, ombros e tríceps recebem volume moderado. RIR 1-2 e descansos de 60-150 segundos.` });
}

function buildMockWorkout(anamnesis: AnamnesisForGeneration): WorkoutPlanInput {
  const variation = Math.floor(Math.random() * 3);
  if (anamnesis.gender === 'FEMALE') return buildFemaleMockWorkout(anamnesis);
  const equipment = normalize(anamnesis.availableEquip);
  const hasGym = [
    'academia',
    'halter',
    'barra',
    'maquina',
    'cabo',
    'polia',
  ].some((term) => equipment.includes(term));
  const shoulderRestricted = hasSubacromialRestriction(anamnesis.injuries);
  const safetyNote = shoulderRestricted
    ? 'Manter amplitude confortável no plano escapular. Sem rotação interna forçada.'
    : 'Cadência controlada na fase excêntrica; manter estabilização escapular.';

  // DIA 1: Peito, Ombros (anterior/lateral) e Tríceps
  const splitA: SplitInput = {
    name: 'Dia 1 - Peito e Tríceps',
    focus: 'Hipertrofia e força — peitoral, deltoide anterior/lateral e tríceps',
    exercises: [
      exercise(
        hasGym ? (variation === 0 ? 'Supino inclinado com halteres' : variation === 1 ? 'Supino inclinado na máquina' : 'Supino inclinado com barra') : 'Flexão de braços com pés elevados',
        4,
        '8-10',
        2,
        120,
        '3-0-1-0',
        hasGym ? 'Banco em 30° a 45°. Foco no feixe clavicular do peitoral.' : safetyNote,
      ),
      exercise(
        hasGym ? (variation === 0 ? 'Supino reto com halteres ou barra' : variation === 1 ? 'Supino reto na máquina' : 'Supino reto com barra') : 'Flexão de braços tradicional',
        4,
        '8-12',
        2,
        120,
        '3-0-1-0',
        'Cotovelos a ~45° do tronco para preservar a articulação glenoumeral.',
      ),
      exercise(
        hasGym ? (variation === 0 ? 'Crossover no cabo (polia média)' : variation === 1 ? 'Crucifixo na máquina' : 'Crossover na polia alta') : 'Crucifixo com elástico',
        3,
        '10-12',
        1,
        90,
        '2-1-2-0',
        'Pico de contração de 1s na adução horizontal.',
      ),
      exercise(
        hasGym ? 'Elevação lateral com halteres' : 'Elevação lateral com garrafas/elástico',
        4,
        '10-15',
        1,
        75,
        '2-0-1-1',
        'Executar no plano escapular (~30° à frente da linha coronal), até 90° de abdução.',
      ),
      exercise(
        hasGym ? 'Tríceps na polia com corda' : 'Tríceps no banco/cadeira',
        3,
        '10-12',
        1,
        75,
        '2-0-2-0',
        'Abertura no final da extensão para maior ativação lateral/medial.',
      ),
      exercise(
        hasGym ? 'Tríceps francês unilateral ou testa' : 'Tríceps testa unilateral',
        3,
        '10-12',
        2,
        75,
        '3-0-1-0',
        'Ombro fletido para enfatizar o trabalho da cabeça longa do tríceps.',
      ),
    ],
  };

  // DIA 2: Costas, Deltoide Posterior e Bíceps
  const splitB: SplitInput = {
    name: 'Dia 2 - Costas e Bíceps',
    focus: 'Hipertrofia e tração — latíssimo do dorso, trapézio, deltoide posterior e flexores de cotovelo',
    exercises: [
      exercise(
        hasGym ? (variation === 0 ? 'Puxada alta frontal pegada pronada aberta' : variation === 1 ? 'Puxada neutra na máquina' : 'Puxada unilateral na polia') : 'Barra fixa ou puxada com elástico',
        4,
        '8-12',
        2,
        120,
        '3-0-1-0',
        'Puxar em direção à fúrcula esternal; focar na depressão escapular inicial.',
      ),
      exercise(
        hasGym ? (variation === 0 ? 'Remada curvada ou cavalinho' : variation === 1 ? 'Remada articulada na máquina' : 'Remada unilateral com halter') : 'Remada curvada unilateral',
        4,
        '8-10',
        2,
        120,
        '2-1-1-0',
        'Tronco estabilizado a 45°-60°, coluna lombar neutra e ativação dorsal.',
      ),
      exercise(
        hasGym ? 'Remada baixa na polia com triângulo' : 'Remada com toalha na porta',
        3,
        '10-12',
        1,
        90,
        '2-1-2-0',
        'Retração escapular completa no pico concêntrico sem hiperextender a lombar.',
      ),
      exercise(
        hasGym ? 'Crucifixo inverso ou Face Pull na polia' : 'Crucifixo inverso com elástico',
        3,
        '12-15',
        1,
        75,
        '2-1-1-0',
        'Ênfase em deltoide posterior e romboides para saúde postural do ombro.',
      ),
      exercise(
        hasGym ? 'Rosca bíceps direta com barra W' : 'Rosca bíceps direta',
        3,
        '8-10',
        1,
        90,
        '3-0-1-0',
        'Evitar balanço de tronco; cotovelos alinhados à lateral do tronco.',
      ),
      exercise(
        hasGym ? 'Rosca martelo com halteres' : 'Rosca martelo unilateral',
        3,
        '10-12',
        1,
        75,
        '2-0-2-0',
        'Pegada neutra ativando braquial e braquiorradial.',
      ),
    ],
  };

  // DIA 3: Membros Inferiores (Completo)
  const splitC: SplitInput = {
    name: 'Dia 3 - Membros Inferiores',
    focus: 'Força e hipertrofia — quadríceps, isquiotibiais, glúteos e panturrilhas',
    exercises: [
      exercise(
        hasGym ? (variation === 0 ? 'Agachamento livre ou no Smith' : variation === 1 ? 'Hack squat' : 'Agachamento frontal com barra') : 'Agachamento livre com pausa',
        4,
        '8-10',
        2,
        150,
        '3-1-1-0',
        'Base confortável, joelhos apontando na direção das pontas dos pés.',
      ),
      exercise(
        hasGym ? 'Leg press 45°' : 'Afundo búlgaro',
        4,
        '10-12',
        2,
        120,
        '3-0-1-0',
        'Amplitude completa tolerada sem retroversão excessiva da pelve.',
      ),
      exercise(
        hasGym ? 'Cadeira extensora' : 'Sissy squat assistido',
        3,
        '12-15',
        1,
        75,
        '2-1-2-0',
        'Pausa de 1s no pico de extensão do joelho (reto femoral sob tensão).',
      ),
      exercise(
        hasGym ? 'Stiff com halteres ou barra' : 'Stiff unilateral com halter',
        4,
        '8-10',
        2,
        120,
        '3-1-1-0',
        'Dobradiça pura de quadril; manter coluna rígida e sentir alongamento dos isquiotibiais.',
      ),
      exercise(
        hasGym ? 'Mesa flexora ou Cadeira flexora' : 'Flexão de joelhos no chão com toalha',
        3,
        '10-12',
        1,
        75,
        '2-1-2-0',
        'Contração contínua dos flexores de joelho sem elevar o quadril do apoio.',
      ),
      exercise(
        hasGym ? 'Panturrilha em pé na máquina' : 'Panturrilha unilateral no degrau',
        4,
        '12-15',
        1,
        60,
        '2-2-1-1',
        'Pausa de 2s no ponto mais baixo de alongamento do tendão de Aquiles.',
      ),
    ],
  };

  // DIA 4: Ombros, Abdômen e Braços Complementares
  const splitD: SplitInput = {
    name: 'Dia 4 - Ombros e Abdômen',
    focus: 'Desenvolvimento de deltóides, trapézio e fortalecimento de core',
    exercises: [
      exercise(
        hasGym ? (variation === 0 ? 'Desenvolvimento com halteres sentado' : variation === 1 ? 'Desenvolvimento na máquina' : 'Desenvolvimento na polia unilateral') : 'Flexão pique ou com elevação',
        4,
        '8-10',
        2,
        120,
        '3-0-1-0',
        shoulderRestricted
          ? 'Pegada neutra, amplitude sem dor.'
          : 'Halteres à frente no plano escapular, descida até o nível da orelha.',
      ),
      exercise(
        hasGym ? 'Elevação lateral na polia média' : 'Elevação lateral com pausa de 1s',
        4,
        '12-15',
        1,
        60,
        '2-0-1-1',
        'Tensão constante proporcionada pelo cabo; postura ereta.',
      ),
      exercise(
        hasGym ? 'Remada alta com pegada aberta na polia' : 'Encolhimento com halteres',
        3,
        '10-12',
        2,
        75,
        '2-1-1-0',
        'Pegada bem aberta na linha dos cotovelos, focando em deltoide lateral.',
      ),
      exercise(
        hasGym ? 'Abdominal na polia alta (corda)' : 'Abdominal crunch no solo',
        3,
        '12-15',
        1,
        60,
        '2-1-2-0',
        'Flexão ativa da coluna toracolombar, não apenas inclinação de quadril.',
      ),
      exercise('Prancha frontal isométrica', 3, '40-60 s', 2, 60, 'isométrica', 'Manter pelve neutra e glúteos contraídos.'),
    ],
  };

  const templates = [splitA, splitB, splitC, splitD];
  const days = Math.min(Math.max(anamnesis.weeklyDays, 1), 7);
  const splits = Array.from({ length: days }, (_, index) => templates[index % templates.length]);

  const restrictionSummary = anamnesis.injuries.length
    ? `Restrições atendidas: ${anamnesis.injuries.join('; ')}.`
    : 'Sem lesões articulares prévias relatadas.';

  return WorkoutPlanSchema.parse({
    splits,
    rationale: `Prescrição técnica periodizada em ${days} sessões semanais para ${anamnesis.user.name} (${anamnesis.goal}). Volume adequado de 5 a 6 exercícios por sessão (16-22 séries semanais por grupamento principal), com controle de RIR (1 a 2 repetições em reserva) e tempos de intervalo calibrados para recuperação neuromuscular completa. ${restrictionSummary}`,
  });
}

function buildTechnicalPrompt(anamnesis: AnamnesisForGeneration, excludedExercises: string[], methodology: TrainingMethodology) {
  const payload = {
    studentName: anamnesis.user.name,
    goal: anamnesis.goal,
    experience: anamnesis.experience,
    gender: anamnesis.gender,
    weeklyDays: anamnesis.weeklyDays,
    injuries: anamnesis.injuries,
    availableEquipment: anamnesis.availableEquip,
    excludedExercises,
    methodology: methodology.name,
  };

  return `Você é um Fisiologista do Exercício e Treinador de Força de Elite, especialista em biomecânica, periodização e segurança clínica.
Sua missão é estruturar um plano de treinamento completo, profissional, contemporâneo e 100% aplicável em academia comercial.

METODOLOGIA OBRIGATÓRIA DESTA PRESCRIÇÃO:
${methodology.name}
Diretriz de aplicação: ${methodology.description}
Não use automaticamente a divisão Peito/Tríceps tradicional se ela não for coerente com esta metodologia.

DIRETRIZES TÉCNICAS E METODOLÓGICAS:
1. VOLUME E SELEÇÃO DE EXERCÍCIOS POR SESSÃO:
   - CADA SPLIT DEVE CONTER OBRIGATORIAMENTE ENTRE 5 E 7 EXERCÍCIOS (NUNCA prescreva menos de 5 exercícios por dia).
   - Sessões de Peito/Tríceps: prescreva 3 ou 4 exercícios para peitoral (composto pesado horizontal, variação inclinada para feixe clavicular e isolador em cabo/máquina) e 2 a 3 para tríceps (tríceps corda/polia + tríceps com flexão de ombro como francês/testa).
   - Sessões de Costas/Bíceps: prescreva 3 ou 4 para dorsais (variação de puxada vertical como pulley + remada curvada/baixa horizontal + deltoide posterior) e 2 para flexores de cotovelo (rosca direta + rosca martelo/inclinada).
   - Sessões de Membros Inferiores: prescreva agachamento/leg press + cadeira extensora + stiff/RDL + mesa flexora + panturrilha.
2. ORDEM DE EXECUÇÃO:
   - Sempre comece pelos multiarticulares pesados e de maior demanda neural (ex: agachamentos, supinos, puxadas, terras romenos).
   - Finalize a sessão com monoarticulares, cabos e abdominais.
3. PRESCRIÇÃO DE INTENSIDADE E DESCANSO:
   - Séries: 3 a 4 séries de trabalho por exercício.
   - Repetições: 6-10 reps para compostos pesados de força/tensão mecânica; 8-12 reps para hipertrofia padrão; 10-15 reps para cabos/isoladores.
   - RIR (Repetições na Reserva): Mantenha entre 1 e 2 RIR na grande maioria das séries de trabalho (esforço real próximo à falha técnica concêntrica). Em compostos axiais livres, use RIR 2 a 3 por segurança.
   - Descanso (restSeconds): 90 a 150 segundos para multiarticulares pesados; 60 a 90 segundos para monoarticulares/cabos.
4. BIOMECÂNICA E LESÕES:
   - Proíba desenvolvimento por trás do pescoço ou puxadas atrás da nuca sob qualquer hipótese.
	   - Para relatos de dor no ombro ou impacto subacromial: prefira halteres com pegada neutra/semipronada, elevações laterais no plano escapular até 90° e puxadas neutras.
5. PERSONALIZAÇÃO POR SEXO BIOLÓGICO: para FEMALE priorize glúteos e membros inferiores, com ao menos 2 dias de pernas quando a frequência permitir, hip thrust, búlgaro inclinado, abdução e trabalho de posterior/quadríceps; superiores devem enfatizar costas/postura, deltoides e tríceps com volume moderado de peitoral. Para MALE, use volume substancial em peitoral, dorsais, deltoides e braços, mantendo pernas completas e pesadas. Para todos: 5 a 7 exercícios, 16 a 24 séries diárias, RIR 1-2 e descansos de 90-150s em multiarticulares e 60-90s em isoladores.
6. VARIABILIDADE: Diversifique a escolha dos exercícios em relação a treinos padrão anteriores, utilizando variações válidas biomecanicamente (ex: halteres vs. barra, polias, pegadas e máquinas diferentes), preservando o objetivo e as restrições da anamnese. Não repita os exercícios da lista EXERCÍCIOS A EVITAR quando houver alternativa segura.
   7. CRIE EXATAMENTE ${anamnesis.weeklyDays} SPLITS (um para cada dia semanal disponível), organizados de acordo com a metodologia selecionada.

SCHEMA JSON RIGOROSO:
{
  "splits": [{
    "name": "Dia 1 - Peito e Tríceps",
    "focus": "Hipertrofia e força de peitoral e extensores de cotovelo",
    "exercises": [{
      "name": "Supino inclinado com halteres",
      "sets": 4,
      "reps": "8-10",
      "rir": 2,
      "restSeconds": 120,
      "cadence": "3-0-1-0",
      "notes": "Banco em 30°. Controlar a descida sentindo alongar a porção clavicular."
    }]
  }],
  "rationale": "Explique a metodologia ${methodology.name}, as escolhas biomecânicas e o controle do volume de séries semanais."
}

DADOS DA ANAMNESE:
<ANAMNESE>${JSON.stringify(payload)}</ANAMNESE>

Retorne SOMENTE o JSON válido preenchido, sem formatações Markdown ou explicações fora do JSON.`;
}

export async function generateWorkoutPlan(
  anamnesis: AnamnesisForGeneration,
  excludedExercises: string[] = [],
  requestedMethodology?: string,
): Promise<{ plan: WorkoutPlanInput; mode: GenerationMode }> {
  const shouldMock = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim().toLowerCase() === 'mock';
  const methodology = selectTrainingMethodology(requestedMethodology);

  if (shouldMock) {
    const basePlan = applyMethodologyToMock(buildMockWorkout(anamnesis), methodology);
    const plan = attachExerciseVideos({
      ...basePlan,
      rationale: `${basePlan.rationale} Metodologia deste ciclo: ${methodology.name} — ${methodology.description}`,
    });
    assertBiomechanicalSafety(plan, anamnesis.injuries);
    return { plan, mode: 'mock' };
  }

  try {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            `Você é um Fisiologista do Exercício e Treinador de Força de Elite. Aplique obrigatoriamente a metodologia selecionada, respeite a anamnese e retorne exclusivamente JSON válido. Metodologia: ${methodology.name}. Diretriz: ${methodology.description}`,
        },
        { role: 'user', content: `${buildTechnicalPrompt(anamnesis, excludedExercises, methodology)}\nEXERCÍCIOS A EVITAR: ${JSON.stringify(excludedExercises)}` },
      ],
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new AiGenerationError('A OpenAI retornou uma resposta vazia.');
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(content);
    } catch (error) {
      throw new AiGenerationError('A OpenAI retornou JSON inválido.', error);
    }

    const parsed = WorkoutPlanSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new AiGenerationError('O treino gerado não passou na validação Zod.', parsed.error.flatten());
    }

    if (parsed.data.splits.length !== anamnesis.weeklyDays) {
      throw new AiGenerationError(
        `A IA gerou ${parsed.data.splits.length} splits, mas a anamnese exige ${anamnesis.weeklyDays}.`,
      );
    }

    const plan = attachExerciseVideos(parsed.data);
    assertBiomechanicalSafety(plan, anamnesis.injuries);
    return { plan, mode: 'openai' };
  } catch (error) {
    if (error instanceof AiGenerationError) throw error;
    throw new AiGenerationError(
      'Não foi possível gerar o treino com a OpenAI. Confirme a chave, o modelo e a conexão.',
      error,
    );
  }
}
