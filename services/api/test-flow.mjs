const base = 'http://127.0.0.1:3333/api';

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} retornou ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

const users = await request('/users?role=STUDENT');
if (!Array.isArray(users.users) || !users.users[0]) throw new Error('Seed não criou aluno.');
const student = users.users[0];

const anamnesisResult = await request('/anamnesis', {
  method: 'POST',
  body: JSON.stringify({
    userId: student.id,
    goal: 'Hipertrofia segura e melhora de força geral',
    experience: 'INTERMEDIATE',
    weeklyDays: 3,
    injuries: ['Impacto subacromial no ombro direito'],
    availableEquip: 'Academia completa com máquinas, cabos, barras e halteres',
  }),
});
if (!anamnesisResult.anamnesis?.id) throw new Error('Anamnese não foi criada.');

const generated = await request('/workouts/generate', {
  method: 'POST',
  body: JSON.stringify({ anamnesisId: anamnesisResult.anamnesis.id }),
});
if (generated.generationMode !== 'mock') throw new Error('Teste deveria usar o modo mock.');
if (generated.workout.status !== 'DRAFT') throw new Error('Treino gerado não está em rascunho.');
if (generated.workout.splits.length !== 3) throw new Error('Quantidade de splits diferente da anamnese.');

const lateralRaises = generated.workout.splits
  .flatMap((split) => split.exercises)
  .filter((exercise) => exercise.name.toLowerCase().includes('elevação lateral'));
if (lateralRaises.some((exercise) => !String(exercise.notes).includes('90'))) {
  throw new Error('Restrição subacromial não foi aplicada às elevações.');
}

const editPayload = {
  rationale: `${generated.workout.rationale} Revisão automatizada confirmada.`,
  splits: generated.workout.splits.map((split) => ({
    name: split.name,
    focus: split.focus,
    exercises: split.exercises.map((exercise, exerciseIndex) => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      rir: exercise.rir,
      restSeconds: exercise.restSeconds,
      ...(exercise.cadence ? { cadence: exercise.cadence } : {}),
      ...(exercise.notes ? { notes: exercise.notes } : {}),
      ...(exerciseIndex === 0 ? { videoUrl: 'https://example.com/exercicio.mp4' } : {}),
    })),
  })),
};
const edited = await request(`/workouts/${generated.workout.id}`, {
  method: 'PUT',
  body: JSON.stringify(editPayload),
});
if (!edited.workout.rationale.includes('Revisão automatizada')) throw new Error('Edição não foi persistida.');

const approved = await request(`/admin/workouts/${generated.workout.id}/approve`, { method: 'PATCH' });
if (approved.workout.status !== 'ACTIVE') throw new Error('Treino não foi ativado.');
if (approved.notification.mode !== 'structured-log') throw new Error('Fallback de WhatsApp não foi executado.');

const studentWorkout = await request(`/student/active-workout/${student.id}`);
if (studentWorkout.workout.id !== generated.workout.id) throw new Error('Consulta do aluno não retornou plano ativo.');
if (studentWorkout.workout.splits[0].exercises[0].videoUrl !== 'https://example.com/exercicio.mp4') throw new Error('URL de vídeo não foi persistida.');

const firstExercise = studentWorkout.workout.splits[0].exercises[0];
const logged = await request('/workouts/log', {
  method: 'POST',
  body: JSON.stringify({
    userId: student.id,
    exercise: firstExercise.name,
    setNumber: 1,
    weightUsed: 20,
    repsDone: 10,
    rpe: 7.5,
  }),
});
if (logged.log.repsDone !== 10) throw new Error('Registro da série falhou.');

const progressedWorkout = await request(`/student/active-workout/${student.id}`);
const lastLog = progressedWorkout.workout.splits[0].exercises[0].lastLog;
if (!lastLog || lastLog.weightUsed !== 20 || lastLog.repsDone !== 10 || lastLog.rpe !== 7.5) {
  throw new Error('Último registro não foi anexado ao exercício.');
}

const checkInResult = await request('/student/checkin', {
  method: 'POST',
  body: JSON.stringify({
    userId: student.id,
    painLevel: 6,
    painLocation: 'Ombro direito',
    fatigueLevel: 5,
    weightKg: 78.2,
    notes: 'Dor moderada após a sessão.',
    photoUrls: [],
  }),
});
if (checkInResult.checkIn.painLevel !== 6) throw new Error('Check-in não foi persistido.');

const checkInHistory = await request(`/admin/checkins/${student.id}`);
if (!checkInHistory.checkIns.some((item) => item.id === checkInResult.checkIn.id)) throw new Error('Histórico de check-ins incompleto.');

const overdueWebhook = await request('/webhooks/mercadopago', {
  method: 'POST',
  body: JSON.stringify({
    action: 'payment.updated',
    type: 'payment',
    data: { id: 'mock-payment-flow' },
    mockPayment: { id: 'mock-payment-flow', status: 'rejected', external_reference: student.id, transaction_amount: 99.9, currency_id: 'BRL' },
  }),
});
if (overdueWebhook.subscriptionStatus !== 'OVERDUE') throw new Error('Pagamento recusado não bloqueou a assinatura.');

const blockedWorkout = await fetch(`${base}/student/active-workout/${student.id}`);
if (blockedWorkout.status !== 402) throw new Error('Guard de assinatura não bloqueou o treino.');

const activeWebhook = await request('/webhooks/mercadopago', {
  method: 'POST',
  body: JSON.stringify({
    action: 'payment.updated',
    type: 'payment',
    data: { id: 'mock-payment-flow' },
    mockPayment: { id: 'mock-payment-flow', status: 'approved', external_reference: student.id, transaction_amount: 99.9, currency_id: 'BRL' },
  }),
});
if (activeWebhook.subscriptionStatus !== 'ACTIVE') throw new Error('Pagamento aprovado não reativou a assinatura.');

await request(`/student/active-workout/${student.id}`);

const invalid = await fetch(`${base}/workouts/log`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: student.id, exercise: 'Exercício inexistente', setNumber: 1, weightUsed: 10, repsDone: 10 }),
});
if (invalid.status !== 404) throw new Error('API aceitou exercício fora do treino ativo.');

console.log(JSON.stringify({
  success: true,
  student: student.name,
  anamnesisId: anamnesisResult.anamnesis.id,
  workoutId: generated.workout.id,
  splits: generated.workout.splits.length,
  generationMode: generated.generationMode,
  loggedExercise: firstExercise.name,
  lastWeight: lastLog.weightUsed,
  checkInPainLevel: checkInResult.checkIn.painLevel,
  subscriptionStatus: activeWebhook.subscriptionStatus,
}, null, 2));
