export type MuscleGroup = 'Peito' | 'Costas' | 'Quadríceps' | 'Posteriores' | 'Core';
export type CatalogExercise = { id: string; muscleGroup: MuscleGroup; name: string; orientation: string; videoUrl: string; tags: string[] };

// Matriz oficial: o ID é a única referência aceita pelo gerador de treino.
// Substitua os links abaixo pelos vídeos oficiais escolhidos pela EVOTrainer,
// mantendo sempre o mesmo ID para preservar a integridade das fichas já geradas.
export const EXERCISE_DATABASE: Record<MuscleGroup, CatalogExercise[]> = {
  Peito: [
    { id: 'peito-supino-halteres', muscleGroup: 'Peito', name: 'Supino reto com halteres', orientation: 'Retração escapular, punhos neutros; controle a fase excêntrica e empurre na fase concêntrica.', videoUrl: 'https://www.youtube.com/results?search_query=supino+reto+com+halteres+execução', tags: ['academia', 'iniciante', 'hipertrofia'] },
    { id: 'peito-flexao-inclinada', muscleGroup: 'Peito', name: 'Flexão de braços inclinada', orientation: 'Corpo alinhado; desça em controle excêntrico e realize a extensão de cotovelos na fase concêntrica.', videoUrl: 'https://www.youtube.com/results?search_query=flexão+de+braços+inclinada+execução', tags: ['casa', 'iniciante'] },
    { id: 'peito-supino-inclinado', muscleGroup: 'Peito', name: 'Supino inclinado com halteres', orientation: 'Escápulas estáveis e rotação umeral controlada; controle a descida antes da pressão.', videoUrl: 'https://www.youtube.com/results?search_query=supino+inclinado+com+halteres+execução', tags: ['academia', 'hipertrofia'] }
  ],
  Costas: [
    { id: 'costas-puxada-pronada', muscleGroup: 'Costas', name: 'Puxada alta com pegada pronada', orientation: 'Depressão escapular e cotovelos orientados ao tronco; retorne lentamente na fase excêntrica.', videoUrl: 'https://www.youtube.com/results?search_query=puxada+alta+pegada+pronada+execução', tags: ['academia', 'iniciante'] },
    { id: 'costas-remada-unilateral', muscleGroup: 'Costas', name: 'Remada unilateral com halter', orientation: 'Coluna neutra; conduza o cotovelo para trás na fase concêntrica e controle o alongamento.', videoUrl: 'https://www.youtube.com/results?search_query=remada+unilateral+com+halter+execução', tags: ['casa', 'academia'] },
    { id: 'costas-remada-baixa', muscleGroup: 'Costas', name: 'Remada baixa na polia', orientation: 'Mantenha o tronco estável e realize retração escapular sem compensar com a lombar.', videoUrl: 'https://www.youtube.com/results?search_query=remada+baixa+polia+execução', tags: ['academia', 'hipertrofia'] }
  ],
  Quadríceps: [
    { id: 'quad-agachamento-goblet', muscleGroup: 'Quadríceps', name: 'Agachamento goblet', orientation: 'Pelve e coluna neutras; controle a flexão de joelhos na descida e suba com pressão no solo.', videoUrl: 'https://www.youtube.com/results?search_query=agachamento+goblet+execução', tags: ['casa', 'iniciante'] },
    { id: 'quad-leg-press', muscleGroup: 'Quadríceps', name: 'Leg press 45°', orientation: 'Amplitude tolerada sem perda do apoio lombar; controle a fase excêntrica e estenda sem travar os joelhos.', videoUrl: 'https://www.youtube.com/results?search_query=leg+press+45+execução', tags: ['academia', 'hipertrofia'] },
    { id: 'quad-afundo-reverso', muscleGroup: 'Quadríceps', name: 'Afundo reverso', orientation: 'Passo posterior estável; mantenha o joelho alinhado e retorne com extensão de quadril e joelho.', videoUrl: 'https://www.youtube.com/results?search_query=afundo+reverso+execução', tags: ['casa', 'academia'] }
  ],
  Posteriores: [
    { id: 'post-levantamento-romeno', muscleGroup: 'Posteriores', name: 'Levantamento terra romeno', orientation: 'Dissociação de quadril; desça com controle excêntrico mantendo a coluna neutra e estenda o quadril na subida.', videoUrl: 'https://www.youtube.com/results?search_query=levantamento+terra+romeno+execução', tags: ['academia', 'hipertrofia'] },
    { id: 'post-elevacao-pelvica', muscleGroup: 'Posteriores', name: 'Elevação pélvica', orientation: 'Retroversão pélvica suave no topo; controle a descida e realize extensão de quadril sem hiperextensão lombar.', videoUrl: 'https://www.youtube.com/results?search_query=elevação+pélvica+execução', tags: ['casa', 'iniciante'] },
    { id: 'post-flexao-joelhos', muscleGroup: 'Posteriores', name: 'Flexão de joelhos na máquina', orientation: 'Quadril estabilizado; realize a flexão de joelho com controle na fase excêntrica.', videoUrl: 'https://www.youtube.com/results?search_query=flexão+de+joelhos+mesa+flexora+execução', tags: ['academia', 'hipertrofia'] }
  ],
  Core: [
    { id: 'core-prancha-frontal', muscleGroup: 'Core', name: 'Prancha frontal', orientation: 'Pelve neutra, costelas direcionadas para baixo e respiração contínua durante a isometria.', videoUrl: 'https://www.youtube.com/results?search_query=prancha+frontal+execução', tags: ['casa', 'iniciante'] },
    { id: 'core-dead-bug', muscleGroup: 'Core', name: 'Dead bug', orientation: 'Mantenha contato lombar controlado; mova membros com expiração e sem perder a posição pélvica.', videoUrl: 'https://www.youtube.com/results?search_query=dead+bug+exercício+execução', tags: ['casa', 'iniciante'] },
    { id: 'core-pallof', muscleGroup: 'Core', name: 'Pallof press na polia', orientation: 'Resista à rotação do tronco; estabilize o complexo lombo-pélvico durante a extensão dos braços.', videoUrl: 'https://www.youtube.com/results?search_query=pallof+press+polia+execução', tags: ['academia', 'core'] }
  ]
};
export const exerciseBase = Object.values(EXERCISE_DATABASE).flat();
export const exerciseById = new Map(exerciseBase.map(exercise => [exercise.id, exercise]));
