/** Photos prises depuis le chat, en attente d'être reprises par la page Scanner. */
let pending: File[] = [];

export function setPendingScan(files: File[]) {
  pending = files.slice(0, 10);
}

export function takePendingScan(): File[] {
  const out = pending;
  pending = [];
  return out;
}
