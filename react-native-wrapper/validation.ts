/**
 * Validações para dados de pagamento usando Zod
 * 
 * @module validation
 */

import { z } from 'zod';

/**
 * Schema de validação para configuração do SDK
 */
export const sdkConfigSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, 'API Key é obrigatória')
    .max(200, 'API Key muito longa'),
  environment: z
    .enum(['production', 'sandbox'])
    .optional()
    .default('sandbox'),
  enableLogs: z.boolean().optional().default(false),
  timeout: z.number().int().min(10).max(120).optional().default(30),
});

/**
 * Schema de validação para dados de pagamento
 */
export const paymentDataSchema = z.object({
  amount: z
    .number()
    .positive('Valor deve ser maior que zero')
    .max(1000000, 'Valor excede o limite permitido')
    .refine((val) => Number.isFinite(val), 'Valor inválido')
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val.toString()), 'Valor deve ter no máximo 2 casas decimais'),
  
  installments: z
    .number()
    .int('Número de parcelas deve ser inteiro')
    .min(1, 'Mínimo 1 parcela')
    .max(12, 'Máximo 12 parcelas')
    .optional()
    .default(1),
  
  orderId: z
    .string()
    .trim()
    .min(1, 'Order ID é obrigatório')
    .max(100, 'Order ID muito longo')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Order ID deve conter apenas letras, números, hífen e underscore'),
  
  description: z
    .string()
    .trim()
    .max(500, 'Descrição muito longa')
    .optional(),
  
  paymentType: z
    .enum(['credit', 'debit', 'pix'])
    .optional(),
  
  customerName: z
    .string()
    .trim()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .optional(),
  
  customerDocument: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, '')) // Remove caracteres não numéricos
    .refine(
      (val) => val.length === 11 || val.length === 14,
      'CPF deve ter 11 dígitos ou CNPJ 14 dígitos'
    )
    .refine(validateCPF, 'CPF inválido')
    .optional(),
  
  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .optional(),
  
  customerPhone: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10 && val.length <= 11, 'Telefone deve ter 10 ou 11 dígitos')
    .optional(),
  
  metadata: z.record(z.any()).optional(),
});

/**
 * Schema para ID de transação
 */
export const transactionIdSchema = z
  .string()
  .trim()
  .min(1, 'Transaction ID é obrigatório')
  .max(100, 'Transaction ID muito longo');

// =============================================================================
// FUNÇÕES DE VALIDAÇÃO CUSTOMIZADAS
// =============================================================================

/**
 * Valida CPF (algoritmo oficial)
 */
function validateCPF(cpf: string): boolean {
  if (cpf.length !== 11) return true; // Deixa o CNPJ passar

  // CPFs inválidos conhecidos
  const invalidCPFs = [
    '00000000000',
    '11111111111',
    '22222222222',
    '33333333333',
    '44444444444',
    '55555555555',
    '66666666666',
    '77777777777',
    '88888888888',
    '99999999999',
  ];

  if (invalidCPFs.includes(cpf)) return false;

  // Validar dígitos verificadores
  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata CPF/CNPJ
 */
export function formatDocument(document: string): string {
  const clean = document.replace(/\D/g, '');
  
  if (clean.length === 11) {
    // CPF: 000.000.000-00
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (clean.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return document;
}

/**
 * Formata telefone
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length === 11) {
    // Celular: (00) 00000-0000
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (clean.length === 10) {
    // Fixo: (00) 0000-0000
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Valida e sanitiza dados de pagamento
 */
export function validatePaymentData(data: unknown) {
  return paymentDataSchema.parse(data);
}

/**
 * Valida e sanitiza configuração do SDK
 */
export function validateSdkConfig(config: unknown) {
  return sdkConfigSchema.parse(config);
}

/**
 * Valida ID de transação
 */
export function validateTransactionId(transactionId: unknown) {
  return transactionIdSchema.parse(transactionId);
}

// Exportar tipos inferidos dos schemas
export type ValidatedPaymentData = z.infer<typeof paymentDataSchema>;
export type ValidatedSdkConfig = z.infer<typeof sdkConfigSchema>;
