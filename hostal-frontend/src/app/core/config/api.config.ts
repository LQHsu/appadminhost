// URL base del backend NestJS para DESARROLLO LOCAL. En build de
// producción (`ng build`), Angular reemplaza este archivo completo por
// api.config.prod.ts — ver "fileReplacements" en angular.json.
export const API_URL = 'http://localhost:3000';

// En local nunca pedimos la clave de acceso (el backend local no
// exige APP_KEY, y no tiene caso meter fricción a tu propio flujo de
// desarrollo). Solo se activa en el build de producción.
export const REQUIERE_CLAVE = false;
