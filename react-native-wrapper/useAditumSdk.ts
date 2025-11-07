/**
 * Hook React personalizado para integração com Aditum SDK
 * 
 * @module useAditumSdk
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import AditumSdk, {
  SdkConfig,
  PaymentData,
  PaymentResult,
  PaymentError,
  PaymentMethod,
  TransactionStatusInfo,
} from './index';

interface UseAditumSdkOptions {
  /** Configuração do SDK */
  config: SdkConfig;
  /** Auto-inicializar quando o componente montar (padrão: true) */
  autoInitialize?: boolean;
  /** Callback quando pagamento iniciar */
  onPaymentStarted?: (data: { orderId: string; amount: number }) => void;
  /** Callback quando pagamento for bem-sucedido */
  onPaymentSuccess?: (result: PaymentResult) => void;
  /** Callback quando ocorrer erro */
  onPaymentError?: (error: PaymentError) => void;
  /** Callback quando pagamento for cancelado */
  onPaymentCancelled?: (data: { orderId: string; reason: string }) => void;
}

interface UseAditumSdkReturn {
  /** Se o SDK está inicializado */
  initialized: boolean;
  /** Se está carregando (inicializando ou processando) */
  loading: boolean;
  /** Erro atual, se houver */
  error: string | null;
  /** Último resultado de pagamento bem-sucedido */
  lastPaymentResult: PaymentResult | null;
  /** Métodos de pagamento disponíveis */
  paymentMethods: PaymentMethod[];
  /** Inicializa o SDK manualmente */
  initialize: () => Promise<void>;
  /** Processa um pagamento */
  processPayment: (data: PaymentData) => Promise<PaymentResult>;
  /** Cancela uma transação */
  cancelTransaction: (transactionId: string) => Promise<void>;
  /** Verifica status de uma transação */
  checkTransactionStatus: (transactionId: string) => Promise<TransactionStatusInfo>;
  /** Limpa o erro atual */
  clearError: () => void;
  /** Reseta todo o estado */
  reset: () => Promise<void>;
}

/**
 * Hook para gerenciar o Aditum SDK com estado React
 * 
 * @example
 * ```typescript
 * function PaymentScreen() {
 *   const {
 *     initialized,
 *     loading,
 *     error,
 *     processPayment,
 *     lastPaymentResult,
 *   } = useAditumSdk({
 *     config: {
 *       apiKey: 'sua-chave',
 *       environment: 'sandbox'
 *     },
 *     onPaymentSuccess: (result) => {
 *       console.log('Pagamento aprovado!', result.transactionId);
 *     },
 *     onPaymentError: (error) => {
 *       console.error('Erro:', error.message);
 *     }
 *   });
 * 
 *   const handlePay = async () => {
 *     await processPayment({
 *       amount: 100.00,
 *       orderId: 'ORDER-123',
 *       description: 'Compra de produto'
 *     });
 *   };
 * 
 *   return (
 *     <View>
 *       {loading && <ActivityIndicator />}
 *       {error && <Text>{error}</Text>}
 *       <Button
 *         title="Pagar"
 *         onPress={handlePay}
 *         disabled={!initialized || loading}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAditumSdk(options: UseAditumSdkOptions): UseAditumSdkReturn {
  const { config, autoInitialize = true } = options;

  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPaymentResult, setLastPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const isInitializing = useRef(false);
  const cleanupFunctions = useRef<Array<() => void>>([]);

  // ==========================================================================
  // INICIALIZAÇÃO
  // ==========================================================================

  const initialize = useCallback(async () => {
    if (isInitializing.current) {
      return;
    }

    try {
      isInitializing.current = true;
      setLoading(true);
      setError(null);

      const result = await AditumSdk.initialize(config);

      if (result.initialized) {
        setInitialized(true);

        // Buscar métodos de pagamento disponíveis
        try {
          const methods = await AditumSdk.getAvailablePaymentMethods();
          setPaymentMethods(methods);
        } catch (err) {
          console.warn('Não foi possível carregar métodos de pagamento:', err);
        }

        // Registrar listeners de eventos
        setupEventListeners();
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao inicializar SDK');
      setInitialized(false);
    } finally {
      setLoading(false);
      isInitializing.current = false;
    }
  }, [config]);

  // Auto-inicializar quando o componente montar
  useEffect(() => {
    if (autoInitialize && !initialized && !isInitializing.current) {
      initialize();
    }

    // Cleanup quando desmontar
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, [autoInitialize, initialize]);

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  const setupEventListeners = useCallback(() => {
    // Payment Started
    if (options.onPaymentStarted) {
      const cleanup = AditumSdk.onPaymentStarted(options.onPaymentStarted);
      cleanupFunctions.current.push(cleanup);
    }

    // Payment Success
    const successCleanup = AditumSdk.onPaymentSuccess((result) => {
      setLastPaymentResult(result);
      setLoading(false);
      options.onPaymentSuccess?.(result);
    });
    cleanupFunctions.current.push(successCleanup);

    // Payment Error
    const errorCleanup = AditumSdk.onPaymentError((err) => {
      setError(err.message);
      setLoading(false);
      options.onPaymentError?.(err);
    });
    cleanupFunctions.current.push(errorCleanup);

    // Payment Cancelled
    const cancelledCleanup = AditumSdk.onPaymentCancelled((data) => {
      setError(`Pagamento cancelado: ${data.reason}`);
      setLoading(false);
      options.onPaymentCancelled?.(data);
    });
    cleanupFunctions.current.push(cancelledCleanup);
  }, [options]);

  // ==========================================================================
  // MÉTODOS PÚBLICOS
  // ==========================================================================

  const processPayment = useCallback(async (data: PaymentData): Promise<PaymentResult> => {
    if (!initialized) {
      throw new Error('SDK não inicializado');
    }

    try {
      setLoading(true);
      setError(null);

      const result = await AditumSdk.processPayment(data);
      setLastPaymentResult(result);

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Falha ao processar pagamento';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  const cancelTransaction = useCallback(async (transactionId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await AditumSdk.cancelTransaction(transactionId);
    } catch (err: any) {
      const errorMessage = err.message || 'Falha ao cancelar transação';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkTransactionStatus = useCallback(
    async (transactionId: string): Promise<TransactionStatusInfo> => {
      try {
        setLoading(true);
        setError(null);

        return await AditumSdk.getTransactionStatus(transactionId);
      } catch (err: any) {
        const errorMessage = err.message || 'Falha ao verificar status';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(async () => {
    try {
      setLoading(true);
      await AditumSdk.reset();
      setInitialized(false);
      setError(null);
      setLastPaymentResult(null);
      setPaymentMethods([]);
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================================
  // RETORNO
  // ==========================================================================

  return {
    initialized,
    loading,
    error,
    lastPaymentResult,
    paymentMethods,
    initialize,
    processPayment,
    cancelTransaction,
    checkTransactionStatus,
    clearError,
    reset,
  };
}

export default useAditumSdk;
