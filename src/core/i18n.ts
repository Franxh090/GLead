/**
 * Interface text (PRD D7): English and Spanish. `t(key)` returns the current
 * language's string, or English when a key is not yet translated, so a
 * missing translation never breaks a screen. Musical names (chord symbols,
 * note names, numerals) are not translated; the trial log stays in English
 * because it is data.
 */
import { useSyncExternalStore } from 'react';

export type Language = 'en' | 'es';
export const LANGUAGES: readonly { id: Language; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
];

type Dict = Record<string, string>;

const en: Dict = {
  'nav.today': 'Today',
  'nav.keys': 'Keys',
  'nav.changes': 'Changes',
  'nav.loops': 'Loops',
  'nav.progress': 'Progress',
  'nav.settings': 'Settings',
  'today.title': 'Today',
  'today.blurb':
    'Hear the key, play the note. Each session mixes keys and brings back what you missed.',
  'today.due': '{n} cards due.',
  'today.length': 'Length',
  'today.min': '{n} min',
  'today.skills': 'Skills',
  'today.resting': ' (resting)',
  'today.restingHint': 'Resting until its retest, so the retest measures what stuck',
  'today.micOff':
    'The microphone is off, so you answer by tapping. Turn it on in Settings to answer on your guitar.',
  'today.start': 'Start session',
  'today.placementTitle': 'Start with the placement test',
  'today.placementBody':
    ' (about six minutes). It sets your baseline, so later retests can show what you have gained.',
  'today.placementButton': 'Take the placement test',
  'today.retestDue': 'Retest due:',
  'today.retestBody':
    '{skill}, {days} days after you reached criterion. In keys you have not practised, so it measures what transferred.',
  'today.startRetest': 'Start retest',
  'today.nextRetest': 'Next retest: {skill} on {date}.',
  'today.lastWrote': 'Last time you wrote:',
  'today.week': 'This week: {n} of {goal} sessions.',
  'today.scheduleInterleaved':
    "This week's practice is interleaved: keys change every trial and skills are mixed.",
  'today.scheduleBlocked':
    "This week's practice is blocked: one key for the session and skills one after another, the control arm of the interleaving experiment.",
  'session.preparing': 'Preparing your session…',
  'session.goalTitle': 'This session',
  'session.goalWhy':
    'Reviews first, because retrieval before new material warms the ear; then one new thing; then music. Keys change every trial on purpose: it feels harder and holds better.',
  'session.begin': 'Begin',
  'session.trial': 'Trial {n} of {total}',
  'session.startListening': 'Start listening',
  'session.retryMic': 'Retry microphone',
  'session.micOn': 'Mic on',
  'session.end': 'End session',
  'session.right': 'Right: {expected}.',
  'session.wrong': 'That was {expected}. You gave {given}.',
  'session.next': 'Next',
  'session.done': 'Session done',
  'session.placementDone': 'Placement done',
  'session.retestDone': 'Retest done ({delay})',
  'session.summary':
    "over {n} trials. Today's score is the least telling number: what counts is the retest in a week, in a key you have not practised.",
  'session.key': 'Key',
  'session.trials': 'Trials',
  'session.rightCol': 'Right',
  'session.reflect': 'Thirty seconds: what was hard, and what will you try next time?',
  'session.save': 'Save and finish',
  'session.savePlay': 'Save, then {n} minutes over a loop',
  'drill.hearAgain': 'Hear it again',
  'drill.listening': 'Listening…',
  'drill.confirmTitle': 'Confirm what you played',
  'drill.confirmBody': 'I heard {heard}, but I am only {pct}% sure. Is that what you played?',
  'drill.confirmYes': 'Yes, that was it',
  'drill.confirmNo': 'No, let me play again',
  'drill.heard': 'Heard {n} of {total}.',
  'b1.question': '{key}. Listen, then play the note you heard, or tap its degree.',
  'b1.group': 'Scale degree',
  'b2.question': '{key}. After the cadence, one chord. Tap its numeral, or play its root.',
  'b2.group': 'Roman numeral',
  'b3.question':
    'A {quality} chord, then one of its notes. Play that note back, or tap which chord tone it is.',
  'b3.group': 'Chord tone',
  'b4.question': '{key}. {n} notes. Listen, then play them back in order.',
  'b5.chord': '{key}. Four chords; one of them is not in the key. Which?',
  'b5.note': '{key}. Five notes of the scale; one is a half step off. Which?',
  'b5.whichChord': 'Which chord',
  'b5.whichNote': 'Which note',
  'b8.question': 'Two notes, the second above the first. Which interval?',
  'b8.group': 'Interval',
  'b8.hint': 'Think of {song}.',
  'tone.Root': 'Root',
  'tone.3rd': '3rd',
  'tone.5th': '5th',
  'tone.7th': '7th',
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.mic': 'Answer on the guitar (microphone)',
  'settings.testMic': 'Test the microphone',
  'settings.micLab': 'Run the Mic lab (five minutes)',
  'settings.confirm': 'Ask me to confirm when the mic is less than {pct}% sure',
  'settings.imagine': 'Imagine first: a silent beat before you play',
  'settings.labels': 'Degree labels',
  'settings.neck': 'Neck',
  'settings.tuning': 'Tuning',
  'settings.accidentals': 'Accidentals',
  'settings.sound': 'Sound',
  'settings.goal': 'Weekly goal: {goal}',
  'settings.goalOff': 'off',
  'settings.goalN': '{n} sessions',
  'settings.goalNote':
    'A goal counts sessions; it never changes what the schedule asks you to practise.',
  'settings.data': 'Your data',
  'settings.dataNote':
    'Everything stays on this device: results and settings only, never audio. Export it from Progress.',
  'settings.delete': 'Delete all my data…',
  'settings.deleteYes': 'Yes, delete everything',
  'settings.keep': 'Keep it',
  'settings.on': 'On',
  'settings.off': 'Off',
  'progress.title': 'Progress',
  'progress.blurb':
    'Delayed and transfer results first: they show what stuck, not what felt fluent today.',
  'progress.export': 'Export my data (JSON)',
  'progress.view': 'View an export file',
  'keys.title': 'Keys',
  'keys.findKey': 'Find my key',
  'keys.findKeyBlurb': 'Play a phrase, eight notes or so, and see which keys fit it best.',
  'keys.findKeyStart': 'Listen for a phrase',
  'keys.findKeyDone': 'Done, which key?',
  'keys.findKeyResult': 'Best fit: {best}. Also possible: {others}.',
  'keys.findKeyNone': 'Nothing heard yet.',
  'changes.title': 'Changes',
  'loops.title': 'Loops',
};

const es: Dict = {
  'nav.today': 'Hoy',
  'nav.keys': 'Tonalidades',
  'nav.changes': 'Cambios',
  'nav.loops': 'Bucles',
  'nav.progress': 'Progreso',
  'nav.settings': 'Ajustes',
  'today.title': 'Hoy',
  'today.blurb':
    'Oye la tonalidad, toca la nota. Cada sesión mezcla tonalidades y repasa lo que fallaste.',
  'today.due': '{n} tarjetas pendientes.',
  'today.length': 'Duración',
  'today.min': '{n} min',
  'today.skills': 'Destrezas',
  'today.resting': ' (en reposo)',
  'today.restingHint': 'En reposo hasta su reevaluación, para que mida lo que quedó',
  'today.micOff':
    'El micrófono está apagado, así que respondes tocando la pantalla. Actívalo en Ajustes para responder con la guitarra.',
  'today.start': 'Empezar sesión',
  'today.placementTitle': 'Empieza por la prueba de nivel',
  'today.placementBody':
    ' (unos seis minutos). Fija tu punto de partida, para que las reevaluaciones muestren lo que ganaste.',
  'today.placementButton': 'Hacer la prueba de nivel',
  'today.retestDue': 'Reevaluación pendiente:',
  'today.retestBody':
    '{skill}, {days} días después de alcanzar el criterio. En tonalidades que no has practicado, para medir lo que se transfirió.',
  'today.startRetest': 'Empezar reevaluación',
  'today.nextRetest': 'Próxima reevaluación: {skill} el {date}.',
  'today.lastWrote': 'La última vez escribiste:',
  'today.week': 'Esta semana: {n} de {goal} sesiones.',
  'today.scheduleInterleaved':
    'Esta semana la práctica es intercalada: la tonalidad cambia en cada intento y las destrezas se mezclan.',
  'today.scheduleBlocked':
    'Esta semana la práctica es en bloque: una tonalidad por sesión y las destrezas una tras otra, el grupo de control del experimento de intercalado.',
  'session.preparing': 'Preparando tu sesión…',
  'session.goalTitle': 'Esta sesión',
  'session.goalWhy':
    'Primero repasos, porque recordar antes de lo nuevo calienta el oído; luego una cosa nueva; luego música. La tonalidad cambia en cada intento a propósito: cuesta más y dura más.',
  'session.begin': 'Empezar',
  'session.trial': 'Intento {n} de {total}',
  'session.startListening': 'Empezar a escuchar',
  'session.retryMic': 'Reintentar micrófono',
  'session.micOn': 'Micro activo',
  'session.end': 'Terminar sesión',
  'session.right': 'Correcto: {expected}.',
  'session.wrong': 'Era {expected}. Respondiste {given}.',
  'session.next': 'Siguiente',
  'session.done': 'Sesión terminada',
  'session.placementDone': 'Prueba de nivel terminada',
  'session.retestDone': 'Reevaluación terminada ({delay})',
  'session.summary':
    'en {n} intentos. La nota de hoy es la que menos dice: lo que cuenta es la reevaluación dentro de una semana, en una tonalidad que no has practicado.',
  'session.key': 'Tonalidad',
  'session.trials': 'Intentos',
  'session.rightCol': 'Aciertos',
  'session.reflect': 'Treinta segundos: ¿qué costó y qué probarás la próxima vez?',
  'session.save': 'Guardar y terminar',
  'session.savePlay': 'Guardar y luego {n} minutos sobre un bucle',
  'drill.hearAgain': 'Oírlo otra vez',
  'drill.listening': 'Escuchando…',
  'drill.confirmTitle': 'Confirma lo que tocaste',
  'drill.confirmBody': 'Oí {heard}, pero solo estoy {pct}% seguro. ¿Es lo que tocaste?',
  'drill.confirmYes': 'Sí, eso era',
  'drill.confirmNo': 'No, déjame tocar otra vez',
  'drill.heard': 'Oídas {n} de {total}.',
  'b1.question': '{key}. Escucha y luego toca la nota que oíste, o pulsa su grado.',
  'b1.group': 'Grado de la escala',
  'b2.question':
    '{key}. Tras la cadencia, un acorde. Pulsa su número romano o toca su fundamental.',
  'b2.group': 'Número romano',
  'b3.question':
    'Un acorde {quality} y luego una de sus notas. Tócala, o pulsa qué nota del acorde es.',
  'b3.group': 'Nota del acorde',
  'b4.question': '{key}. {n} notas. Escucha y luego tócalas en orden.',
  'b5.chord': '{key}. Cuatro acordes; uno no es de la tonalidad. ¿Cuál?',
  'b5.note': '{key}. Cinco notas de la escala; una está un semitono fuera. ¿Cuál?',
  'b5.whichChord': 'Qué acorde',
  'b5.whichNote': 'Qué nota',
  'b8.question': 'Dos notas, la segunda por encima de la primera. ¿Qué intervalo?',
  'b8.group': 'Intervalo',
  'b8.hint': 'Piensa en {song}.',
  'tone.Root': 'Fundamental',
  'tone.3rd': '3.ª',
  'tone.5th': '5.ª',
  'tone.7th': '7.ª',
  'settings.title': 'Ajustes',
  'settings.language': 'Idioma',
  'settings.mic': 'Responder con la guitarra (micrófono)',
  'settings.testMic': 'Probar el micrófono',
  'settings.micLab': 'Ejecutar el laboratorio de micro (cinco minutos)',
  'settings.confirm': 'Pídeme confirmar cuando el micro esté menos del {pct}% seguro',
  'settings.imagine': 'Imaginar primero: un tiempo en silencio antes de tocar',
  'settings.labels': 'Etiquetas de grados',
  'settings.neck': 'Mástil',
  'settings.tuning': 'Afinación',
  'settings.accidentals': 'Alteraciones',
  'settings.sound': 'Sonido',
  'settings.goal': 'Meta semanal: {goal}',
  'settings.goalOff': 'sin meta',
  'settings.goalN': '{n} sesiones',
  'settings.goalNote': 'La meta cuenta sesiones; nunca cambia lo que el plan te pide practicar.',
  'settings.data': 'Tus datos',
  'settings.dataNote':
    'Todo se queda en este dispositivo: resultados y ajustes, nunca audio. Expórtalo desde Progreso.',
  'settings.delete': 'Borrar todos mis datos…',
  'settings.deleteYes': 'Sí, borrar todo',
  'settings.keep': 'Conservar',
  'settings.on': 'Sí',
  'settings.off': 'No',
  'progress.title': 'Progreso',
  'progress.blurb':
    'Primero los resultados diferidos y de transferencia: muestran lo que quedó, no lo que pareció fluido hoy.',
  'progress.export': 'Exportar mis datos (JSON)',
  'progress.view': 'Ver un archivo exportado',
  'keys.title': 'Tonalidades',
  'keys.findKey': 'Encuentra mi tonalidad',
  'keys.findKeyBlurb': 'Toca una frase, unas ocho notas, y mira qué tonalidades encajan mejor.',
  'keys.findKeyStart': 'Escuchar una frase',
  'keys.findKeyDone': 'Listo, ¿qué tonalidad?',
  'keys.findKeyResult': 'Mejor encaje: {best}. También posibles: {others}.',
  'keys.findKeyNone': 'Aún no se oyó nada.',
  'changes.title': 'Cambios',
  'loops.title': 'Bucles',
};

const DICTS: Record<Language, Dict> = { en, es };

let current: Language = 'en';
const listeners = new Set<() => void>();

export function setLanguage(lang: Language): void {
  if (lang === current) return;
  current = lang;
  listeners.forEach((l) => l());
}

export function getLanguage(): Language {
  return current;
}

/** The browser's language, if GLead has it. */
export function detectLanguage(navigatorLanguage: string | undefined): Language {
  return navigatorLanguage?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function translate(
  lang: Language,
  key: string,
  vars: Record<string, string | number> = {},
): string {
  const text = DICTS[lang][key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function t(key: string, vars?: Record<string, string | number>): string {
  return translate(current, key, vars);
}

/** Re-renders when the language changes. */
export function useT(): typeof t {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
  return t;
}

/** Keys English has that Spanish lacks: the test keeps the dictionaries in step. */
export function untranslated(lang: Language): string[] {
  return Object.keys(en).filter((k) => !(k in DICTS[lang]));
}
