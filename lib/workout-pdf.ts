import { promises as fs } from 'fs';
import path from 'path';
import type { WorkoutPlan } from './workout-generator';

const PAGE_WIDTH = 595, PAGE_HEIGHT = 842, LEFT = 42, RIGHT = 553;
const ink = '17211B', lime = 'D9F36A', muted = '657269';
type Link = { x: number; y: number; w: number; h: number; url: string };

function pdfText(value: string) { const map: Record<string, string> = { 'á':'e1','à':'e0','ã':'e3','â':'e2','é':'e9','ê':'ea','í':'ed','ó':'f3','ô':'f4','õ':'f5','ú':'fa','ç':'e7','Á':'c1','À':'c0','Ã':'c3','Â':'c2','É':'c9','Ê':'ca','Í':'cd','Ó':'d3','Ô':'d4','Õ':'d5','Ú':'da','Ç':'c7','—':'97','–':'96','…':'85','°':'b0','↗':'d7' }; let out = ''; for (const char of value) out += map[char] || (/^[\x20-\x7e]$/.test(char) ? char.charCodeAt(0).toString(16).padStart(2, '0') : '3f'); return `<${out.toUpperCase()}>`; }
function esc(value: string) { return value.replace(/([\\()])/g, '\\$1'); }
function color(hex: string) { return `${parseInt(hex.slice(0,2),16)/255} ${parseInt(hex.slice(2,4),16)/255} ${parseInt(hex.slice(4,6),16)/255}`; }
function text(x: number, y: number, size: number, value: string, fill = ink, bold = false) { return `q ${color(fill)} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td ${pdfText(value)} Tj ET Q\n`; }
function rect(x: number, y: number, w: number, h: number, fill: string, radius = 0) { return `q ${color(fill)} rg ${radius ? `${x+radius} ${y} m ${x+w-radius} ${y} l ${x+w} ${y+radius} l ${x+w} ${y+h-radius} l ${x+w-radius} ${y+h} l ${x+radius} ${y+h} l ${x} ${y+h-radius} l ${x} ${y+radius} l h` : `${x} ${y} ${w} ${h} re`} f Q\n`; }
function line(x1: number, y1: number, x2: number, y2: number, stroke = 'E2E7DF') { return `q ${color(stroke)} RG .6 w ${x1} ${y1} m ${x2} ${y2} l S Q\n`; }
function wrap(value: string, max: number) { const words = String(value).split(/\s+/); const lines: string[] = []; let current = ''; for (const word of words) { if ((current + ' ' + word).trim().length > max && current) { lines.push(current); current = word; } else current = `${current} ${word}`.trim(); } if (current) lines.push(current); return lines.length ? lines : ['']; }
function shorten(value: string, max: number) { return value.length > max ? `${value.slice(0, max - 3)}...` : value; }
function columnText(value: string, max: number) { return shorten(String(value).replace(/[\r\n]+/g, ' ').trim(), max); }

export async function createWorkoutPdf(plan: WorkoutPlan, clientName: string, anamnesis: any, orderId: string) {
  const dir = path.join(process.cwd(), 'public', 'generated'); await fs.mkdir(dir, { recursive: true });
  const filename = `${orderId}-treino.pdf`, output = path.join(dir, filename);
  const pages: { content: string; links: Link[] }[] = []; let content = '', links: Link[] = [], y = 0;
  const header = (top: number) => `${text(42, top, 8, 'EXERCÍCIO + ORIENTAÇÃO', muted, true)}${text(255, top, 8, 'SÉRIES', muted, true)}${text(310, top, 8, 'REPS', muted, true)}${text(385, top, 8, 'DESCANSO', muted, true)}${text(460, top, 8, 'VÍDEO', muted, true)}${line(LEFT, top - 8, RIGHT, top - 8, 'B8C5B9')}`;
  const newPage = (day: string, continuation = false) => { if (content) pages.push({ content, links }); content = `${text(LEFT, PAGE_HEIGHT - 48, 17, 'EVOTrainer', ink, true)}${text(LEFT, PAGE_HEIGHT - 68, 8, continuation ? `Continuação — ${shorten(day, 62)}` : shorten(plan.title, 72), muted)}${rect(LEFT, PAGE_HEIGHT - 112, RIGHT - LEFT, 27, lime, 6)}${text(LEFT + 10, PAGE_HEIGHT - 104, 11, shorten(day, 62), ink, true)}${header(PAGE_HEIGHT - 146)}`; links = []; y = PAGE_HEIGHT - 171; };
  content = `${rect(0, PAGE_HEIGHT - 115, PAGE_WIDTH, 115, ink)}${text(LEFT, PAGE_HEIGHT - 53, 25, 'EVOTrainer', lime, true)}${text(LEFT, PAGE_HEIGHT - 83, 15, shorten(plan.title, 72), 'FFFFFF')}${text(LEFT, PAGE_HEIGHT - 153, 20, shorten(clientName, 42), ink, true)}${text(LEFT, PAGE_HEIGHT - 177, 9, `Objetivo: ${shorten(String(anamnesis.goals || '—'), 75)} | Frequência: ${anamnesis.frequency || '—'}`, muted)}${text(LEFT, PAGE_HEIGHT - 210, 8, 'Plano personalizado para orientação geral de treinamento', muted)}`;
  y = PAGE_HEIGHT - 245;
  let currentDay = '';
  for (const row of plan.rows) {
    if (row.day !== currentDay) { currentDay = row.day; if (y < 150) newPage(currentDay); content += rect(LEFT, y - 2, RIGHT - LEFT, 27, lime, 6); content += text(LEFT + 10, y + 6, 11, shorten(currentDay, 62), ink, true); y -= 40; content += header(y); y -= 25; }
    const description = wrap(row.orientation, 42).slice(0, 3); const repsLines = wrap(row.reps, 9).slice(0, 2); const restLines = wrap(row.rest, 9).slice(0, 2); const rowHeight = Math.max(42, 20 + Math.max(description.length, repsLines.length, restLines.length) * 10);
    if (y - rowHeight < 68) { newPage(currentDay, true); }
    content += text(42, y, 9, columnText(row.exercise, 31), ink, true);
    description.forEach((lineText, index) => { content += text(42, y - 12 - index * 9, 7, columnText(lineText, 42), muted); });
    content += text(255, y - 2, 9, columnText(row.sets, 7), ink); repsLines.forEach((value, index) => { content += text(310, y - 2 - index * 10, 8, columnText(value, 9), ink); }); restLines.forEach((value, index) => { content += text(385, y - 2 - index * 10, 8, columnText(value, 9), ink); });
    content += text(460, y - 2, 8, 'Assistir vídeo', '0563C1'); links.push({ x: 460, y: y - 5, w: 85, h: 13, url: row.videoUrl });
    content += line(42, y - rowHeight + 8, 553, y - rowHeight + 8); content += line(250, y + 8, 250, y - rowHeight + 8, 'EEF1EC'); content += line(305, y + 8, 305, y - rowHeight + 8, 'EEF1EC'); content += line(380, y + 8, 380, y - rowHeight + 8, 'EEF1EC'); content += line(455, y + 8, 455, y - rowHeight + 8, 'EEF1EC'); y -= rowHeight;
  }
  content += text(LEFT, 45, 7, 'Prescrição e Revisão por Felipe Cordeiro Ferreira — CREF 071550/RJ (Bacharel e Pós-Graduado em Fisiologia do Exercício)', muted);
  content += text(LEFT, 30, 7, 'Este material é educativo e não substitui avaliação individual de um profissional habilitado.', muted); pages.push({ content, links });

  const objects: string[] = []; const add = (value: string) => { objects.push(value); return objects.length; };
  const regular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); const bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'); const pageRefs: number[] = [];
  for (const page of pages) { const stream = `q\n${page.content}Q\n`; const streamRef = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream`); const annotations = page.links.map(link => add(`<< /Type /Annot /Subtype /Link /Rect [${link.x} ${link.y} ${link.x+link.w} ${link.y+link.h}] /Border [0 0 0] /A << /S /URI /URI (${esc(link.url)}) >> >>`)); pageRefs.push(add(`<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${streamRef} 0 R${annotations.length ? ` /Annots [${annotations.map(ref => `${ref} 0 R`).join(' ')}]` : ''} >>`)); }
  const pagesRef = add(`<< /Type /Pages /Kids [${pageRefs.map(ref => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`); pageRefs.forEach(ref => { objects[ref-1] = objects[ref-1].replace('PAGES_REF', String(pagesRef)); }); const catalog = add(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);
  let pdf = '%PDF-1.4\n%âãÏÓ\n'; const offsets = [0]; objects.forEach((object, index) => { offsets[index+1] = Buffer.byteLength(pdf, 'latin1'); pdf += `${index+1} 0 obj\n${object}\nendobj\n`; }); const xref = Buffer.byteLength(pdf, 'latin1'); pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  await fs.writeFile(output, Buffer.from(pdf, 'latin1')); return `/generated/${filename}`;
}
