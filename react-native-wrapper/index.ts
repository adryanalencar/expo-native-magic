/**
 * Wrapper TypeScript para o módulo nativo AditumSdk
 * 
 * @module AditumSdk
 * @version 1.0.0
 */

import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

const { AditumSdk: NativeAditumSdk } = NativeModules;

if (!NativeAditumSdk) {
  throw new Error(
    '❌ Módulo nativo AditumSdk não encontrado.\n\n' +
    'Certifique-se de que você:\n' +
    '1. Adicionou o arquivo .aar em android/app/libs/\n' +
    '2. Configurou o build.gradle corretamente\n' +
    '3. Registrou o AditumSdkPackage no MainApplication.java\n' +
    '4. Recompilou o app com "npx react-native run-android"\n\n' +
    'Consulte o README.md para instruções detalhadas.'
  );
}

const eventEmitter = new NativeEventEmitter(NativeAditumSdk);

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Ambiente de execução do SDK
 */
export type Environment = 'production' | 'sandbox';

/**
 * Tipo de pagamento
 */
export type PaymentType = 'credit' | 'debit' | 'pix';

/**
 * Status da transação
 */
export type TransactionStatus = 
  | 'pending' 
  | 'processing' 
  | 'approved' 
  | 'declined' 
  | 'cancelled' 
  | 'refunded';

/**
 * Configuração de inicialização do SDK
 */
export interface SdkConfig {
  /** Chave de API fornecida pela Aditum */
  apiKey: string;
  /** Ambiente: 'production' ou 'sandbox' (padrão: 'sandbox') */
  environment?: Environment;
  /** Habilitar logs de debug (padrão: false) */
  enableLogs?: boolean;
  /** Timeout em segundos (padrão: 30) */
  timeout?: number;
}

/**
 * Dados do pagamento
 */
export interface PaymentData {
  /** Valor do pagamento em reais (ex: 100.50) */
  amount: number;
  /** Número de parcelas (1-12, padrão: 1) */
  installments?: number;
  /** ID único do pedido (obrigatório) */
  orderId: string;
  /** Descrição do pagamento */
  description?: string;
  /** Tipo de pagamento */
  paymentType?: PaymentType;
  /** Nome do cliente */
  customerName?: string;
  /** CPF/CNPJ do cliente */
  customerDocument?: string;
  /** Email do cliente */
  customerEmail?: string;
  /** Telefone do cliente */
  customerPhone?: string;
  /** Metadados adicionais (chave-valor) */
  metadata?: Record<string, any>;
}

/**
 * Resultado do pagamento bem-sucedido
 */
export interface PaymentResult {
  /** Status da operação */
  status: 'success';
  /** ID da transação gerado pela Aditum */
  transactionId: string;
  /** Código de autorização do pagamento */
  authorizationCode: string;
  /** Valor aprovado */
  amount: number;
  /** Mensagem de retorno */
  message: string;
  /** ID do pedido original */
  orderId: string;
  /** Número de parcelas */
  installments: number;
  /** Método de pagamento usado */
  paymentMethod?: string;
  /** Bandeira do cartão (Visa, Master, etc) */
  cardBrand?: string;
  /** Últimos 4 dígitos do cartão */
  lastFourDigits?: string;
  /** Data/hora da transação */
  timestamp?: string;
}

/**
 * Erro de pagamento
 */
export interface PaymentError {
  /** Código do erro */
  code: string;
  /** Mensagem de erro */
  message: string;
  /** ID do pedido relacionado */
  orderId?: string;
  /** Detalhes adicionais do erro */
  details?: Record<string, any>;
}

/**
 * Resultado do cancelamento
 */
export interface CancellationResult {
  /** Status da operação */
  status: 'cancelled';
  /** ID da transação cancelada */
  transactionId: string;
  /** Mensagem de confirmação */
  message?: string;
}

/**
 * Informações de status da transação
 */
export interface TransactionStatusInfo {
  /** ID da transação */
  transactionId: string;
  /** Status atual */
  status: TransactionStatus;
  /** Valor da transação */
  amount?: number;
  /** Data da última atualização */
  updatedAt?: string;
}

/**
 * Método de pagamento disponível
 */
export interface PaymentMethod {
  /** Tipo de pagamento */
  type: PaymentType;
  /** Nome exibido */
  name: string;
  /** Número máximo de parcelas */
  maxInstallments: number;
  /** Se está disponível no momento */
  available?: boolean;
}

/**
 * Informações de versão
 */
export interface VersionInfo {
  /** Versão do SDK nativo */
  sdk: string;
  /** Versão do wrapper */
  wrapper: string;
}

/**
 * Eventos emitidos pelo SDK
 */
export interface SdkEvents {
  /** Pagamento iniciado */
  onPaymentStarted: (data: { orderId: string; amount: number }) => void;
  /** Pagamento em processamento */
  onPaymentProcessing: (data: { orderId: string }) => void;
  /** Pagamento bem-sucedido */
  onPaymentSuccess: (data: PaymentResult) => void;
  /** Erro no pagamento */
  onPaymentError: (error: PaymentError) => void;
  /** Pagamento cancelado */
  onPaymentCancelled: (data: { orderId: string; reason: string }) => void;
}

// ============================================================================
// CLASSE PRINCIPAL DO SDK
// ============================================================================

class AditumSdkWrapper {
  private initialized: boolean = false;
  private eventSubscriptions: Map<string, EmitterSubscription> = new Map();

  /**
   * Inicializa o SDK da Aditum
   * 
   * @example
   * ```typescript
   * await AditumSdk.initialize({
   *   apiKey: 'sua-chave-api',
   *   environment: 'sandbox',
   *   enableLogs: true
   * });
   * ```
   */
  async initialize(config: SdkConfig): Promise<{ status: string; environment: string; initialized: boolean }> {
    try {
      // Validações
      if (!config.apiKey || config.apiKey.trim().length === 0) {
        throw new Error('API Key é obrigatória');
      }

      if (config.environment && !['production', 'sandbox'].includes(config.environment)) {
        throw new Error('Environment deve ser "production" ou "sandbox"');
      }

      const result = await NativeAditumSdk.initialize({
        apiKey: config.apiKey.trim(),
        environment: config.environment || 'sandbox',
        enableLogs: config.enableLogs || false,
        timeout: config.timeout || 30,
      });

      this.initialized = true;
      return result;
    } catch (error: any) {
      this.initialized = false;
      throw new Error(`Falha ao inicializar SDK: ${error.message}`);
    }
  }

  /**
   * Verifica se o SDK está inicializado
   */
  async isInitialized(): Promise<boolean> {
    try {
      return await NativeAditumSdk.isInitialized();
    } catch {
      return false;
    }
  }

  /**
   * Obtém a versão do SDK e do wrapper
   */
  async getVersion(): Promise<VersionInfo> {
    return await NativeAditumSdk.getVersion();
  }

  /**
   * Processa um pagamento
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await AditumSdk.processPayment({
   *     amount: 150.00,
   *     installments: 3,
   *     orderId: 'ORDER-123',
   *     description: 'Compra de produto',
   *     customerName: 'João Silva',
   *     customerEmail: 'joao@email.com'
   *   });
   *   
   *   console.log('Pagamento aprovado:', result.transactionId);
   * } catch (error) {
   *   console.error('Erro:', error.message);
   * }
   * ```
   */
  async processPayment(data: PaymentData): Promise<PaymentResult> {
    // Validações
    this.validatePaymentData(data);

    try {
      const result = await NativeAditumSdk.processPayment({
        amount: data.amount,
        installments: data.installments || 1,
        orderId: data.orderId.trim(),
        description: data.description?.trim(),
        paymentType: data.paymentType,
        customerName: data.customerName?.trim(),
        customerDocument: data.customerDocument?.replace(/\D/g, ''),
        customerEmail: data.customerEmail?.trim().toLowerCase(),
        customerPhone: data.customerPhone?.replace(/\D/g, ''),
        metadata: data.metadata,
      });

      return result;
    } catch (error: any) {
      // Traduzir erros comuns
      const errorMessage = this.translateError(error.code, error.message);
      throw new Error(errorMessage);
    }
  }

  /**
   * Cancela uma transação
   */
  async cancelTransaction(transactionId: string): Promise<CancellationResult> {
    if (!transactionId || transactionId.trim().length === 0) {
      throw new Error('Transaction ID é obrigatório');
    }

    try {
      return await NativeAditumSdk.cancelTransaction(transactionId.trim());
    } catch (error: any) {
      throw new Error(`Falha ao cancelar transação: ${error.message}`);
    }
  }

  /**
   * Verifica o status de uma transação
   */
  async getTransactionStatus(transactionId: string): Promise<TransactionStatusInfo> {
    if (!transactionId || transactionId.trim().length === 0) {
      throw new Error('Transaction ID é obrigatório');
    }

    try {
      return await NativeAditumSdk.getTransactionStatus(transactionId.trim());
    } catch (error: any) {
      throw new Error(`Falha ao buscar status: ${error.message}`);
    }
  }

  /**
   * Obtém lista de métodos de pagamento disponíveis
   */
  async getAvailablePaymentMethods(): Promise<PaymentMethod[]> {
    try {
      return await NativeAditumSdk.getAvailablePaymentMethods();
    } catch (error: any) {
      throw new Error(`Falha ao buscar métodos de pagamento: ${error.message}`);
    }
  }

  /**
   * Reseta o SDK (limpa cache e estado)
   */
  async reset(): Promise<string> {
    try {
      this.removeAllListeners();
      this.initialized = false;
      return await NativeAditumSdk.reset();
    } catch (error: any) {
      throw new Error(`Falha ao resetar SDK: ${error.message}`);
    }
  }

  // ==========================================================================
  // LISTENERS DE EVENTOS
  // ==========================================================================

  /**
   * Adiciona listener para evento de pagamento iniciado
   */
  onPaymentStarted(callback: (data: { orderId: string; amount: number }) => void): () => void {
    return this.addEventListener('onPaymentStarted', callback);
  }

  /**
   * Adiciona listener para evento de pagamento em processamento
   */
  onPaymentProcessing(callback: (data: { orderId: string }) => void): () => void {
    return this.addEventListener('onPaymentProcessing', callback);
  }

  /**
   * Adiciona listener para evento de pagamento bem-sucedido
   */
  onPaymentSuccess(callback: (data: PaymentResult) => void): () => void {
    return this.addEventListener('onPaymentSuccess', callback);
  }

  /**
   * Adiciona listener para evento de erro no pagamento
   */
  onPaymentError(callback: (error: PaymentError) => void): () => void {
    return this.addEventListener('onPaymentError', callback);
  }

  /**
   * Adiciona listener para evento de pagamento cancelado
   */
  onPaymentCancelled(callback: (data: { orderId: string; reason: string }) => void): () => void {
    return this.addEventListener('onPaymentCancelled', callback);
  }

  /**
   * Remove todos os listeners
   */
  removeAllListeners(): void {
    this.eventSubscriptions.forEach(subscription => subscription.remove());
    this.eventSubscriptions.clear();
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

  private addEventListener(eventName: string, callback: (data: any) => void): () => void {
    const subscription = eventEmitter.addListener(eventName, callback);
    this.eventSubscriptions.set(eventName, subscription);

    // Retorna função para remover o listener
    return () => {
      subscription.remove();
      this.eventSubscriptions.delete(eventName);
    };
  }

  private validatePaymentData(data: PaymentData): void {
    if (!data.amount || data.amount <= 0) {
      throw new Error('Valor do pagamento deve ser maior que zero');
    }

    if (data.amount > 1000000) {
      throw new Error('Valor do pagamento excede o limite permitido');
    }

    if (!data.orderId || data.orderId.trim().length === 0) {
      throw new Error('Order ID é obrigatório');
    }

    if (data.orderId.length > 100) {
      throw new Error('Order ID muito longo (máximo 100 caracteres)');
    }

    if (data.installments && (data.installments < 1 || data.installments > 12)) {
      throw new Error('Número de parcelas deve ser entre 1 e 12');
    }

    if (data.customerEmail && !this.isValidEmail(data.customerEmail)) {
      throw new Error('Email inválido');
    }

    if (data.customerDocument) {
      const doc = data.customerDocument.replace(/\D/g, '');
      if (doc.length !== 11 && doc.length !== 14) {
        throw new Error('CPF/CNPJ inválido');
      }
    }
  }

  private isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  private translateError(code: string, message: string): string {
    const errorMap: Record<string, string> = {
      'NOT_INITIALIZED': 'SDK não inicializado. Chame initialize() primeiro.',
      'NO_ACTIVITY': 'Atividade Android não disponível.',
      'INVALID_DATA': 'Dados de pagamento inválidos.',
      'INVALID_CONFIG': 'Configuração inválida.',
      'CANCELLED': 'Pagamento cancelado pelo usuário.',
      'PAYMENT_ERROR': 'Erro ao processar pagamento.',
      'NETWORK_ERROR': 'Erro de conexão. Verifique sua internet.',
      'TIMEOUT': 'Tempo esgotado. Tente novamente.',
    };

    return errorMap[code] || message || 'Erro desconhecido';
  }
}

// Exportar instância única (Singleton)
const AditumSdk = new AditumSdkWrapper();

export default AditumSdk;

// Exportar também os eventos como constantes
export const PAYMENT_EVENTS = {
  STARTED: 'onPaymentStarted',
  PROCESSING: 'onPaymentProcessing',
  SUCCESS: 'onPaymentSuccess',
  ERROR: 'onPaymentError',
  CANCELLED: 'onPaymentCancelled',
} as const;
