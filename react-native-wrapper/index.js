/**
 * Wrapper JavaScript para o módulo nativo AditumSdk
 * 
 * Use este módulo no seu código React Native
 */

import { NativeModules } from 'react-native';

const { AditumSdk } = NativeModules;

if (!AditumSdk) {
  throw new Error(
    'Módulo nativo AditumSdk não encontrado. ' +
    'Certifique-se de que você:\n' +
    '1. Adicionou o arquivo .aar em android/app/libs/\n' +
    '2. Registrou o AditumSdkPackage no MainApplication.java\n' +
    '3. Recompilou o app com "npx react-native run-android"'
  );
}

/**
 * Interface TypeScript para o módulo
 */
export interface PaymentData {
  amount: number;
  installments?: number;
  orderId: string;
  description?: string;
}

export interface PaymentResult {
  status: 'success';
  transactionId: string;
  authorizationCode: string;
  amount: number;
  message: string;
}

export interface AditumSdkInterface {
  /**
   * Inicializa o SDK da Aditum
   * @param apiKey - Sua chave de API
   * @param environment - 'production' ou 'sandbox'
   */
  initialize(apiKey: string, environment: 'production' | 'sandbox'): Promise<string>;

  /**
   * Processa um pagamento
   * @param paymentData - Dados do pagamento
   */
  processPayment(paymentData: PaymentData): Promise<PaymentResult>;

  /**
   * Cancela uma transação
   * @param transactionId - ID da transação
   */
  cancelTransaction(transactionId: string): Promise<any>;

  /**
   * Verifica o status de uma transação
   * @param transactionId - ID da transação
   */
  checkTransactionStatus(transactionId: string): Promise<any>;
}

export default AditumSdk as AditumSdkInterface;
