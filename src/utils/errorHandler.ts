import axios from 'axios';

/**
 * Parsea un error (Axios, JS, etc.) y devuelve un mensaje amigable en español.
 * @param error - El objeto de error capturado en el catch block.
 * @returns {string} - El mensaje de error listo para mostrar al usuario.
 */
export const getErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    // 1. Errores con respuesta del servidor (4xx, 5xx)
    if (error.response) {
      const { status, data } = error.response;

      // Intentar extraer mensaje específico del backend
      // El backend podría devolver { error: "..." } o { message: "..." } o string directo
      const serverMessage = data?.error || data?.message || (typeof data === 'string' ? data : '');

      if (serverMessage) {
        return serverMessage;
      }

      // Contexto específico: Login
      // Algunos backends devuelven 500 o 400 genérico cuando fallan las credenciales
      const isLogin = error.config?.url?.includes('/Login');
      if (isLogin && (status === 500 || status === 400)) {
        return 'Credenciales incorrectas o problema con el servidor. Por favor verifica tu correo y contraseña.';
      }

      // Mensajes por defecto según código de estado
      switch (status) {
        case 400:
          return 'Solicitud incorrecta. Por favor, verifica los datos enviados.';
        case 401:
          return 'No autorizado. Tu sesión ha expirado o las credenciales son incorrectas.';
        case 403:
          return 'Acceso denegado. No tienes permisos para realizar esta acción.';
        case 404:
          return 'No se encontró el recurso solicitado en el servidor.';
        case 408:
          return 'El servidor tardó demasiado en responder. Intenta nuevamente.';
        case 500:
          return 'Error interno del servidor. Por favor, intenta más tarde.';
        case 502:
          return 'Error de puerta de enlace (Bad Gateway). El servidor no está disponible.';
        case 503:
          return 'El servicio no está disponible temporalmente.';
        default:
          return `Error del servidor (${status}).`;
      }
    }

    // 2. Errores sin respuesta (Problemas de red, Timeout)
    if (error.request) {
      if (error.code === 'ECONNABORTED') {
        return 'La solicitud tardó demasiado tiempo. Verifica tu conexión.';
      }
      if (error.message && error.message.includes('Network Error')) {
        return 'Error de conexión. Verifica que tienes internet y puedes acceder al servidor.';
      }
      return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    }
  }

  // 3. Errores genéricos de JS o mensajes lanzados manualmente
  if (error instanceof Error) {
    // Si es un error genérico pero tiene mensaje útil
    if (error.message === 'Network Error') {
        return 'Error de conexión. Verifica tu red.';
    }
    return error.message;
  }

  // 4. Fallback final
  return 'Ocurrió un error inesperado. Intenta nuevamente.';
};
