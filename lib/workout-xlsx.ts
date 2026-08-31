import ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import path from 'path';
import type { WorkoutPlan } from './workout-generator';

export async function createWorkoutXlsx(plan: WorkoutPlan, clientName: string, orderId: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Treino', { views: [{ state: 'frozen', ySplit: 2 }] });
  ws.columns = [
    { header: 'Dia', key: 'day', width: 25 }, { header: 'Exercício', key: 'exercise', width: 26 },
    { header: 'Orientação', key: 'orientation', width: 52 }, { header: 'Séries', key: 'sets', width: 10 },
    { header: 'Repetições', key: 'reps', width: 16 }, { header: 'Descanso', key: 'rest', width: 14 },
    { header: 'Vídeo', key: 'videoUrl', width: 42 }
  ];
  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = `${plan.title} | ${clientName}`;
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '17211B' } };
  ws.getRow(2).values = ['Dia', 'Exercício', 'Orientação', 'Séries', 'Repetições', 'Descanso', 'Vídeo'];
  ws.getRow(2).font = { bold: true, color: { argb: '17211B' } };
  ws.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9F36A' } };
  for (const row of plan.rows) {
    const r = ws.addRow(row);
    r.getCell('videoUrl').value = { text: 'Assistir vídeo ↗', hyperlink: row.videoUrl };
    r.getCell('videoUrl').font = { color: { argb: '0563C1' }, underline: true };
    r.alignment = { vertical: 'top', wrapText: true };
  }
  const dir = path.join(process.cwd(), 'public', 'generated');
  await fs.mkdir(dir, { recursive: true });
  const filename = `${orderId}-treino.xlsx`;
  await wb.xlsx.writeFile(path.join(dir, filename));
  return `/generated/${filename}`;
}
