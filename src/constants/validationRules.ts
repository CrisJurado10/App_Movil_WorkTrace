/**
 * Reglas de validación alineadas con el backend (ASP.NET + FluentValidation)
 * Esta es la única fuente de verdad para límites de caracteres
 */

export const VALIDATION_RULES = {
  TakenRequirement: {
    Title: {
      required: true,
      maxLength: 128,
      label: 'Título',
    },
    Description: {
      required: true,
      maxLength: 512,
      label: 'Descripción',
    },
    ClientId: {
      required: false,
      label: 'Cliente',
    },
  },
  Client: {
    FullName: {
      required: true,
      maxLength: 64,
      label: 'Nombre Completo',
    },
    DocumentNumber: {
      required: true,
      minLength: 10,
      maxLength: 13,
      label: 'Número de Documento',
    },
    PhoneNumber: {
      required: true,
      minLength: 10,
      maxLength: 14,
      label: 'Teléfono',
    },
    Email: {
      required: true,
      maxLength: 128,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      label: 'Correo Electrónico',
    },
  },
};

export type ValidationErrorResponse = {
  type: string;
  title: string;
  status: number;
  errors: Record<string, string[]>;
};

export const parseValidationErrors = (error: any): Record<string, string> => {
  const errorMap: Record<string, string> = {};

  if (error.response?.data?.errors) {
    const backendErrors = error.response.data.errors as Record<string, string[]>;
    Object.entries(backendErrors).forEach(([field, messages]) => {
      errorMap[field] = messages[0] || 'Error de validación';
    });
  }

  return errorMap;
};