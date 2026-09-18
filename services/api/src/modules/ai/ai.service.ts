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
    description: 'Divisão por vetores motores: empurrar (horizontal/vertical), tracionar e membros inferiores. Ênfase em sobrecarga progressiva e alternância de implementos.',
  },
  UPPER_LOWER: {
    name: 'Upper / Lower (Alta Frequência - Modelo Helms / Schoenfeld)',
    description: 'Alternância entre tronco e membros inferiores com equilíbrio articular, densidade de treino e controle rigoroso de Repetições em Reserva (RIR).',
  },
  FST7: {
    name: 'Metodologia FST-7 (Fascia Stretch Training)',
    description: 'Exercícios base de tensão mecânica combinados com finalizações de 7 séries (rest 30-45s) em implementos seguros (cabos/máquinas) para expansão fascial.',
  },
  HEAVY_DUTY: {
    name: 'Heavy Duty / Alta Intensidade (Inspirado em Mike Mentzer / Yates)',
    description: 'Baixo volume de séries efetivas (1 a 2 por exercício), esforço máximo próximo à falha técnica e controle cadenciado da fase excêntrica (3-0-1-0).',
  },
  DUP: {
    name: 'Periodização Ondulatória Diária (DUP - Zourdos & Poliquin)',
    description: 'Ondulação de estímulos semanais: dias focados em força tensional (4-6 reps), hipertrofia padrão (8-10 reps) e estresse metabólico (12-15+ reps).',
  },
  ANTAGONIST: {
    name: 'Antagonista / Agonista (Supersets Arnold)',
    description: 'Estímulo pareado e alternado de grupamentos opostos para maximizar densidade, fluxo sanguíneo e eficiência neuromuscular.',
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

function hasSpineRestriction(injuries: string[]) {
  const text = normalize(injuries.join(' '));
  return (
    text.includes('hernia') ||
    text.includes('lombar') ||
    text.includes('coluna') ||
    text.includes('protrusao') ||
    text.includes('espondilo') ||
    text.includes('ciatico')
  );
}

function hasKneeRestriction(injuries: string[]) {
  const text = normalize(injuries.join(' '));
  return (
    text.includes('condromalacia') ||
    text.includes('patela') ||
    text.includes('joelho') ||
    text.includes('menisco') ||
    text.includes('artrose')
  );
}

function hasFibromyalgia(injuries: string[]) {
  const text = normalize(injuries.join(' '));
  return text.includes('fibromialgia') || text.includes('dor cronica');
}

function assertBiomechanicalSafety(plan: WorkoutPlanInput, injuries: string[]) {
  const shoulder = hasSubacromialRestriction(injuries);
  const spine = hasSpineRestriction(injuries);
  const knee = hasKneeRestriction(injuries);
  const fibro = hasFibromyalgia(injuries);

  for (const split of plan.splits) {
    for (const exercise of split.exercises) {
      const name = normalize(exercise.name);

      // Trava 1: Proibir desenvolvimento ou puxadas atrás do pescoço
      if (
        name.includes('por tras') ||
        name.includes('behind the neck') ||
        name.includes('atras da nuca')
      ) {
        throw new AiGenerationError(
          `O exercício "${exercise.name}" é contraindicado por compressão e risco articular excessivo.`,
        );
      }

      // Trava 2: Proteção de ombro
      if (shoulder && name.includes('remada alta') && !name.includes('aberta')) {
        throw new AiGenerationError(
          `O exercício "${exercise.name}" causa impacto subacromial em alunos com restrição no ombro.`,
        );
      }

      // Trava 3: Se tem hérnia/lombalgia grave, alertar sobre agachamentos ou terras livres pesados
      if (spine && (name === 'agachamento livre com barra' || name === 'levantamento terra convencional')) {
        exercise.notes = `${exercise.notes ?? ''} [Atenção clínica: manter tronco apoiado ou carga axial moderada devido à coluna.]`.trim();
      }

      // Trava 4: Condromalácia patelar não deve exceder flexão profunda sob estresse isolado
      if (knee && name.includes('cadeira extensora')) {
        exercise.notes = `${exercise.notes ?? ''} [Executar na angulação de 90° a 45° sem sobrecarga excessiva no ponto final de flexão.]`.trim();
      }

      // Trava 5: Fibromialgia não permite RIR 0 (falha total)
      if (fibro && exercise.rir < 2) {
        exercise.rir = 2;
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
    exercise(gym ? 'Elevação pélvica na máquina ou barra' : 'Elevação pélvica solo', 4, '8-12', 1, 120, '2-1-1-1', 'Pausa isométrica de 1s no topo'),
    exercise(gym ? 'Afundo búlgaro com halteres' : 'Afundo unilateral', 3, '8-12', 2, 90, '3-0-1-0', 'Tronco inclinado a 30° para foco em glúteo'),
    exercise(gym ? 'Levantamento terra romeno (RDL) com halteres' : 'Stiff unilateral', 4, '8-10', 2, 120, '3-1-1-0', 'Dobradiça de quadril mantendo a coluna neutra'),
    exercise(gym ? 'Mesa flexora unilateral' : 'Flexão de joelhos no solo', 3, '10-15', 1, 75, '2-1-2-0'),
    exercise(gym ? 'Cadeira abdutora com tronco inclinado' : 'Abdução com elástico', 3, '15-20', 1, 60, '2-1-2-1'),
  ]);
  const upper = leg('Dia 2 - Costas, Deltoides e Tríceps', 'Postura e estabilidade escapular', [
    exercise(gym ? 'Puxada articulada convergente' : 'Puxada com elástico', 4, '8-12', 2, 90, '3-0-1-0'),
    exercise(gym ? 'Remada baixa unilateral no cabo' : 'Remada unilateral', 4, '8-12', 2, 90, '2-1-1-0'),
    exercise(gym ? 'Elevação lateral no plano escapular' : 'Elevação lateral com elástico', 3, '12-15', 1, 60, '2-0-1-1'),
    exercise(gym ? 'Crucifixo inverso no cabo' : 'Crucifixo inverso com elástico', 3, '12-15', 1, 60, '2-1-1-0'),
    exercise(gym ? 'Tríceps corda na polia' : 'Tríceps no apoio', 3, '10-15', 1, 60, '2-0-2-0'),
  ]);
  const lowerB = leg('Dia 3 - Quadríceps e Glúteos', 'Membros inferiores com foco em quadríceps', [
    exercise(gym ? 'Leg press 45° unilateral' : 'Agachamento goblet', 4, '8-12', 2, 120, '3-0-1-0'),
    exercise(gym ? 'Agachamento no Smith com pés adiantados' : 'Agachamento livre', 4, '8-10', 2, 120, '3-1-1-0'),
    exercise(gym ? 'Cadeira extensora com pico de contração' : 'Afundo dinâmico', 3, '10-15', 1, 75, '2-1-2-0'),
    exercise(gym ? 'Elevação pélvica unilateral' : 'Ponte de glúteos', 3, '10-15', 1, 90, '2-1-1-1'),
    exercise(gym ? 'Panturrilha em pé' : 'Panturrilha solo', 3, '15-20', 1, 60, '2-1-2-1'),
  ]);
  const templates = [lowerA, upper, lowerB];
  const days = Math.min(Math.max(anamnesis.weeklyDays, 1), 7);
  const splits = Array.from({ length: days }, (_, index) => templates[index % templates.length]);
  return WorkoutPlanSchema.parse({
    splits,
    rationale: `Prescrição individualizada feminina focada em glúteos e cadeia posterior para ${anamnesis.user.name}. Estrutura dividida em ${days} sessões com controle de volume, RIR 1-2 e estímulos articulares seguros.`,
  });
}

function buildMockWorkout(anamnesis: AnamnesisForGeneration): WorkoutPlanInput {
  if (anamnesis.gender === 'FEMALE') return buildFemaleMockWorkout(anamnesis);
  const gym = normalize(anamnesis.availableEquip).includes('academia');

  const splitA: SplitInput = {
    name: 'Dia 1 - Peitoral e Tríceps',
    focus: 'Vetores horizontais e extensores de cotovelo',
    exercises: [
      exercise(gym ? 'Supino inclinado 30° com halteres' : 'Flexão inclinada', 4, '8-10', 2, 120, '3-0-1-0', 'Controle excêntrico e abertura escapular'),
      exercise(gym ? 'Supino articulado convergente' : 'Flexão no solo', 4, '8-12', 2, 90, '2-1-1-0'),
      exercise(gym ? 'Crossover na polia média' : 'Crucifixo com elástico', 3, '10-12', 1, 75, '2-1-2-0'),
      exercise(gym ? 'Elevação lateral com halteres no plano escapular' : 'Elevação lateral com faixa', 4, '10-15', 1, 60, '2-0-1-1'),
      exercise(gym ? 'Tríceps corda na polia alta' : 'Tríceps banco', 3, '10-12', 1, 60, '2-0-2-0'),
      exercise(gym ? 'Tríceps francês com halter unilateral' : 'Tríceps testa', 3, '10-12', 2, 60, '3-0-1-0'),
    ],
  };

  const splitB: SplitInput = {
    name: 'Dia 2 - Costas e Bíceps',
    focus: 'Tração vertical, horizontal e flexores de cotovelo',
    exercises: [
      exercise(gym ? 'Puxada alta articulada pegada neutra' : 'Puxada com elástico', 4, '8-12', 2, 90, '3-0-1-0'),
      exercise(gym ? 'Remada peito apoiado no banco 45°' : 'Remada unilateral com halter', 4, '8-10', 2, 90, '2-1-1-0', 'Proteção total da coluna lombar'),
      exercise(gym ? 'Remada baixa na polia com triângulo' : 'Remada com toalha', 3, '10-12', 1, 75, '2-1-2-0'),
      exercise(gym ? 'Crucifixo inverso no cabo' : 'Crucifixo inverso elástico', 3, '12-15', 1, 60, '2-1-1-0'),
      exercise(gym ? 'Rosca no banco inclinado 45° com halteres' : 'Rosca direta', 3, '8-10', 1, 75, '3-0-1-0'),
      exercise(gym ? 'Rosca martelo na polia com corda' : 'Rosca martelo', 3, '10-12', 1, 60, '2-0-2-0'),
    ],
  };

  const splitC: SplitInput = {
    name: 'Dia 3 - Membros Inferiores',
    focus: 'Cadeia anterior, posterior e estabilização lombo-pélvica',
    exercises: [
      exercise(gym ? 'Leg press 45° com pés médios' : 'Agachamento com salto/pausa', 4, '8-12', 2, 120, '3-0-1-0'),
      exercise(gym ? 'Afundo búlgaro com halteres' : 'Afundo livre', 4, '8-10', 2, 90, '3-0-1-0'),
      exercise(gym ? 'Cadeira extensora com pausa de 1s' : 'Agachamento isométrico na parede', 3, '12-15', 1, 75, '2-1-2-0'),
      exercise(gym ? 'Stiff com halteres pegada neutra' : 'Stiff unilateral', 4, '8-10', 2, 90, '3-1-1-0'),
      exercise(gym ? 'Mesa flexora deitada' : 'Flexão nórdica reversa', 3, '10-12', 1, 75, '2-1-2-0'),
      exercise(gym ? 'Panturrilha em pé na máquina' : 'Panturrilha unilateral no degrau', 4, '12-15', 1, 60, '2-2-1-1'),
    ],
  };

  const templates = [splitA, splitB, splitC];
  const days = Math.min(Math.max(anamnesis.weeklyDays, 1), 7);
  const splits = Array.from({ length: days }, (_, index) => templates[index % templates.length]);

  return WorkoutPlanSchema.parse({
    splits,
    rationale: `Prescrição periodizada estruturada para ${anamnesis.user.name} em ${days} sessões semanais. Ênfase no equilíbrio de forças e segurança articular.`,
  });
}

function buildUniversalClinicalEngine(injuries: string[]) {
  if (!injuries || injuries.length === 0) {
    return 'ALUNO SEM QUEIXAS CLÍNICAS: Prescrição livre baseada em sobrecarga progressiva, variação de estímulos e biomecânica eficiente.';
  }

  const injuriesText = injuries.join('; ');

  return `DIRETRIZ CLÍNICA E CINESIOLÓGICA OBRIGATÓRIA:
O aluno informou as seguintes queixas / patologias / limitações:
"${injuriesText}"

Você é um especialista em biomecânica e DEVE adaptar a seleção de exercícios com base nas seguintes regras universais:

1. JOELHO / PATELOFEMORAL (Ex: Condromalácia Patelar, Tendinite, Menisco, Artrose):
   - Evite sobrecarga de cisalhamento patelofemoral profunda (NÃO use cadeira extensora pesada com flexão além de 90°).
   - Dê preferência a exercícios de Cadeia Cinética Fechada (Leg Press com pés altos, Agachamento na caixa/banco, Búlgaro com tronco inclinado).
   - Adicione no campo "notes" do exercício de quadríceps orientações para controle do valgo dinâmico.

2. COLUNA E LOMBAR (Ex: Hérnia de Disco, Protrusão, Espondilolistese, Lombalgia, Dor Ciática):
   - Elimine compressão axial pesada (NÃO prescrever agachamento livre com barra nas costas ou levantamento terra convencional pesado).
   - Substitua por movimentos com suporte torácico e alívio de cisalhamento lombar (Remada com peito apoiado, Leg Press, Belt Squat, Agachamento Búlgaro).

3. OMBRO / CINTURA ESCAPULAR (Ex: Impacto Subacromial, Lesão de Manguito, Bursite):
   - PROIBIDO prescrever qualquer movimento atrás da nuca (puxadas ou desenvolvimentos).
   - Elevações laterais devem ser orientadas estritamente no plano escapular (30° anterior à linha coronal).
   - Para empurrar, prefira halteres com pegada neutra/semi-neutra ou máquinas articuladas convergentes.

4. DORES CRÔNICAS, FIBROMIALGIA E HIPERSENSIBILIDADE:
   - NUNCA prescreva séries até a falha extrema (RIR obrigatório entre 2 e 3).
   - Evite fadiga excessiva da musculatura postural/paravertebral. Priorize bancos apoiados e polias contínuas.

5. QUALQUER OUTRA LIMITAÇÃO NÃO LISTADA ACIMA:
   - Analise a cinesiologia da articulação afetada, elimine exercícios que aumentem a alavanca de sobrecarga sobre a lesão e substitua por variações seguras em máquinas, cabos ou halteres guiados.`;
}

function buildTechnicalPrompt(
  anamnesis: AnamnesisForGeneration,
  excludedExercises: string[],
  methodology: TrainingMethodology,
) {
  const clinicalDirectives = buildUniversalClinicalEngine(anamnesis.injuries);

  // Sorteio dinâmico para garantir rotação vetorial
  const equipmentVectors = [
    'Halteres com diferentes angulações de banco (15°, 30°, 45°, plano e neutro)',
    'Polias e Cabos cruzados com diferentes alturas de saída de força e pegadores variados',
    'Máquinas articuladas, convergentes e unilaterais com suporte torácico',
    'Barras especiais (barra W, barra hexagonal) e variações de pegada (neutra, supinada, pronada)',
    'Implementos de peso corporal com sobrecarga adicional e faixas elásticas',
  ];
  const selectedFocusEquipment = equipmentVectors
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .join('; ');

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

  return `Você é um Fisiologista do Exercício e Treinador de Elite (CREF). Sua missão é prescrever um plano técnico individualizado, criativo, biomecanicamente seguro e sem repetições monótonas.

${clinicalDirectives}

METODOLOGIA OBRIGATÓRIA:
- Método: ${methodology.name}
- Diretriz: ${methodology.description}

DIRETRIZ DA VARIEDADE INFINITA:
- NUNCA monte fichas genéricas ou idênticas a modelos prontos da internet.
- Implementos e vetores a explorar com prioridade neste ciclo: [${selectedFocusEquipment}].
- Alterne ângulos de trabalho (30°, 45°, neutro, unilateral, cabos contínuos).
- EXERCÍCIOS A EVITAR NESTE CICLO (JÁ UTILIZADOS):
  ${excludedExercises.length > 0 ? excludedExercises.join(', ') : 'Nenhum'}
  * Não repita os exercícios listados acima; utilize variações cinesiológicas equivalentes.

ESTRUTURA DA PRESCRIÇÃO:
1. QUANTIDADE DE SPLITS: Crie EXATAMENTE ${anamnesis.weeklyDays} splits.
2. VOLUME: Cada split deve ter entre 5 e 7 exercícios.
3. ADAPTAÇÃO POR GÊNERO:
   - FEMALE: volume prioritário para glúteos e cadeia posterior (búlgaro, elevação pélvica, variações de terra romeno/stiff, abdução, mesa flexora), dedicando ao menos 2 sessões semanais aos membros inferiores quando a frequência permitir; membros superiores com ênfase em postura, deltoides e tríceps.
   - MALE: distribuição equilibrada em peitoral, dorsais, deltoides e braços, mantendo membros inferiores completos e pesados.
4. VARIÁVEIS DE CARGA:
   - Séries: 3 a 4 por exercício.
   - Repetições: 6-10 para compostos pesados, 8-12 para hipertrofia padrão, 10-15 para cabos e isoladores.
   - RIR: entre 1 e 2 (se houver fibromialgia ou patologias de dor, use estritamente RIR 2 a 3).
   - Descanso (restSeconds): 90 a 150s em multiarticulares; 60 a 90s em isoladores/cabos.

RETORNE EXCLUSIVAMENTE O JSON VÁLIDO CONFORME O SCHEMA:
{
  "splits": [
    {
      "name": "Nome da Divisão (Ex: Dia 1 - Torso: Força e Tração com Halteres/Cabos)",
      "focus": "Foco muscular e vetor de força principal",
      "exercises": [
        {
          "name": "Nome Técnico Específico do Exercício (Ex: Supino Inclinado 30° com Halteres Pegada Semi-Neutra)",
          "sets": 3,
          "reps": "8-10",
          "rir": 2,
          "restSeconds": 90,
          "cadence": "3-0-1-0",
          "notes": "Instrução técnica e clínica de execução (ex: manter escápulas deprimidas e não hiperestender o ombro)"
        }
      ]
    }
  ],
  "rationale": "Justificativa fisiológica e cinesiológica completa, explicando a escolha dos exercícios e como a prescrição protege o quadro clínico do aluno."
}

DADOS COMPLETOS DA ANAMNESE:
<ANAMNESE>${JSON.stringify(payload)}</ANAMNESE>`;
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
      temperature: 0.88, // Criatividade calibrada para explorar todo o repertório cinesiológico
      presence_penalty: 0.6, // Penaliza repetição de exercícios tradicionais
      frequency_penalty: 0.3, // Evita nomes e termos redundantes
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Você é um Fisiologista do Exercício e Treinador de Elite. Seu foco é variedade biomecânica de alto nível, segurança clínica rigorosa e retorno estritamente em JSON válido.',
        },
        {
          role: 'user',
          content: buildTechnicalPrompt(anamnesis, excludedExercises, methodology),
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new AiGenerationError('A OpenAI retornou uma resposta vazia.');
    }

    // Sanitização segura contra blocos de código Markdown
    const cleanContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let decoded: unknown;
    try {
      decoded = JSON.parse(cleanContent);
    } catch (error) {
      throw new AiGenerationError('A OpenAI retornou JSON inválido.', error);
    }

    const parsed = WorkoutPlanSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new AiGenerationError(
        'O treino gerado não passou na validação Zod.',
        parsed.error.flatten(),
      );
    }

    // Se a IA gerou um número ligeiramente diferente de splits, ajusta suavemente sem quebrar a requisição
    let finalSplits = parsed.data.splits;
    if (finalSplits.length > anamnesis.weeklyDays) {
      finalSplits = finalSplits.slice(0, anamnesis.weeklyDays);
    } else if (finalSplits.length < anamnesis.weeklyDays && finalSplits.length > 0) {
      while (finalSplits.length < anamnesis.weeklyDays) {
        const copyIndex = finalSplits.length % parsed.data.splits.length;
        const extraSplit = { ...parsed.data.splits[copyIndex] };
        extraSplit.name = `Dia ${finalSplits.length + 1} - ${extraSplit.name.split('-')[1] || 'Complementar'}`;
        finalSplits.push(extraSplit);
      }
    }

    const plan = attachExerciseVideos({
      splits: finalSplits,
      rationale: parsed.data.rationale,
    });

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
