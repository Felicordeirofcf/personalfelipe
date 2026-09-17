import { Workout } from '@/types';

type PrescriptionProfile = {
  goal: string;
  weeklyDays: number;
} | null;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function cycleEndDate(value: string) {
  const date = new Date(value);
  date.setDate(date.getDate() + 42);
  return formatDate(date.toISOString());
}

export function WorkoutPrintSheet({ workout, profile }: { workout: Workout; profile: PrescriptionProfile }) {
  const weeklyDays = profile?.weeklyDays ?? workout.splits.length;
  const objective = profile?.goal ?? 'Treino individualizado com progressão planejada';

  return (
    <section id="printable-workout-sheet" className="print-only workout-print-document" aria-label="Ficha de treino para impressão">
      <header className="print-brand-header">
        <div className="print-brand-lockup">
          <span className="print-brand-mark" aria-hidden="true">CF</span>
          <div>
            <p className="print-brand-name">Consultoria<span>Fit</span></p>
            <p className="print-brand-tagline">Treino Inteligente &amp; Periodização</p>
          </div>
        </div>
        <div className="print-technical-owner">
          <p className="print-meta-label">Responsável técnico</p>
          <p className="print-owner-name">Felipe Ferreira</p>
          <p>CREF 071550-RJ</p>
          <div className="print-date-grid">
            <span><b>Prescrição</b>{formatDate(workout.createdAt)}</span>
            <span><b>Vencimento do ciclo</b>{cycleEndDate(workout.createdAt)}</span>
          </div>
        </div>
      </header>

      <section className="print-student-card" aria-label="Dados do aluno e objetivo">
        <div className="print-card-heading">
          <span>Prontuário de treinamento</span>
          <small>Ciclo estimado · 6 semanas</small>
        </div>
        <div className="print-student-grid">
          <div className="print-student-primary"><span>Aluno</span><strong>{workout.user?.name ?? 'Aluno'}</strong></div>
          <div><span>Objetivo</span><strong>{objective}</strong></div>
          <div><span>Frequência semanal</span><strong>{weeklyDays}x por semana</strong></div>
        </div>
        <div className="print-rationale-box">
          <span>Racional técnico e orientações</span>
          <p>{workout.rationale}</p>
        </div>
      </section>

      <div className="print-workout-days">
        {workout.splits.map((split, splitIndex) => (
          <section key={split.id} className="workout-day-block">
            <div className="print-day-title">
              <span className="print-day-badge">DIA {String(splitIndex + 1).padStart(2, '0')}</span>
              <div><strong>{split.name}</strong><span>{split.focus}</span></div>
              <small>{split.exercises.length} exercícios</small>
            </div>
            <table className="print-exercise-table">
              <colgroup><col className="print-col-exercise" /><col className="print-col-prescription" /><col className="print-col-history" /><col className="print-col-write" /><col className="print-col-write" /></colgroup>
              <thead><tr><th>Exercício e orientação</th><th>Prescrição</th><th>Última sessão</th><th>Carga</th><th>Reps</th></tr></thead>
              <tbody>
                {split.exercises.map((exercise, exerciseIndex) => (
                  <tr key={exercise.id}>
                    <td>
                      <div className="print-exercise-name"><span>{String(exerciseIndex + 1).padStart(2, '0')}</span><strong>{exercise.name}</strong></div>
                      <p className="print-exercise-note">{exercise.notes || 'Execução controlada, amplitude confortável e técnica estável.'}</p>
                      {exercise.videoUrl ? <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="print-video-link">Ver vídeo de execução</a> : null}
                    </td>
                    <td>
                      <div className="print-prescription-badges">
                        <span><b>{exercise.sets}</b> séries</span>
                        <span><b>{exercise.reps}</b> reps</span>
                        <span><b>RIR {exercise.rir}</b></span>
                        <span><b>{exercise.restSeconds}s</b> intervalo</span>
                      </div>
                      {exercise.cadence ? <p className="print-cadence">Cadência: {exercise.cadence}</p> : null}
                    </td>
                    <td>
                      {exercise.lastLog ? <div className="print-last-session"><strong>{exercise.lastLog.weightUsed} kg</strong><span>{exercise.lastLog.repsDone} reps{exercise.lastLog.rpe !== null ? ` · RPE ${exercise.lastLog.rpe}` : ''}</span></div> : <span className="print-no-history">Sem registro</span>}
                    </td>
                    <td><div className="print-write-stack">{Array.from({ length: Math.min(exercise.sets, 8) }, (_, setIndex) => <span key={setIndex}><i>{setIndex + 1}</i></span>)}</div></td>
                    <td><div className="print-write-stack">{Array.from({ length: Math.min(exercise.sets, 8) }, (_, setIndex) => <span key={setIndex}><i>{setIndex + 1}</i></span>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <footer className="print-document-footer">
        <p><strong>ConsultoriaFit</strong> · Prescrição individual e intransferível</p>
        <p>Interrompa o exercício em caso de dor aguda e comunique o responsável técnico.</p>
        <span>Plano {workout.id.slice(-8).toUpperCase()}</span>
      </footer>
    </section>
  );
}
