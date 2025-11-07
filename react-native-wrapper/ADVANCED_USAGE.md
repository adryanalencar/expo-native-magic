# 🚀 Guia de Uso Avançado - Aditum SDK Wrapper

Este guia mostra casos de uso avançados e melhores práticas para integração do Aditum SDK.

## 📚 Índice

- [Validação de Dados](#validação-de-dados)
- [Eventos em Tempo Real](#eventos-em-tempo-real)
- [Tratamento de Erros](#tratamento-de-erros)
- [Formatação de Dados](#formatação-de-dados)
- [Context Provider](#context-provider)
- [Testes](#testes)

---

## Validação de Dados

### Validação Manual com Zod

```typescript
import { validatePaymentData, validateSdkConfig } from './modules/AditumSdk/validation';

// Validar dados de pagamento antes de enviar
try {
  const validData = validatePaymentData({
    amount: 100.50,
    orderId: 'ORDER-123',
    customerEmail: 'invalid-email', // ❌ Vai falhar
  });
} catch (error) {
  console.error('Validação falhou:', error.errors);
}

// Validar configuração do SDK
try {
  const validConfig = validateSdkConfig({
    apiKey: 'minha-chave',
    environment: 'production',
  });
} catch (error) {
  console.error('Config inválida:', error.errors);
}
```

### Validação com React Hook Form

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentDataSchema } from './modules/AditumSdk/validation';

function PaymentForm() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(paymentDataSchema),
    defaultValues: {
      amount: 0,
      installments: 1,
      orderId: '',
      customerName: '',
      customerEmail: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      await AditumSdk.processPayment(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View>
      <Controller
        control={control}
        name="amount"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={String(value)}
            onChangeText={(text) => onChange(parseFloat(text))}
            keyboardType="decimal-pad"
          />
        )}
      />
      {errors.amount && <Text style={{ color: 'red' }}>{errors.amount.message}</Text>}

      {/* Mais campos... */}

      <Button title="Pagar" onPress={handleSubmit(onSubmit)} />
    </View>
  );
}
```

---

## Eventos em Tempo Real

### Ouvir Múltiplos Eventos

```typescript
import AditumSdk from './modules/AditumSdk';

function PaymentScreen() {
  useEffect(() => {
    // Pagamento iniciado
    const unsubscribeStarted = AditumSdk.onPaymentStarted((data) => {
      console.log('💳 Pagamento iniciado:', data.orderId);
      // Mostrar loading, analytics, etc
    });

    // Pagamento em processamento
    const unsubscribeProcessing = AditumSdk.onPaymentProcessing((data) => {
      console.log('⏳ Processando:', data.orderId);
    });

    // Pagamento aprovado
    const unsubscribeSuccess = AditumSdk.onPaymentSuccess((result) => {
      console.log('✅ Aprovado:', result.transactionId);
      // Atualizar UI, enviar para backend, analytics, etc
    });

    // Erro
    const unsubscribeError = AditumSdk.onPaymentError((error) => {
      console.error('❌ Erro:', error.message);
      // Log de erro, retry, etc
    });

    // Cancelamento
    const unsubscribeCancelled = AditumSdk.onPaymentCancelled((data) => {
      console.log('🚫 Cancelado:', data.reason);
    });

    // Cleanup
    return () => {
      unsubscribeStarted();
      unsubscribeProcessing();
      unsubscribeSuccess();
      unsubscribeError();
      unsubscribeCancelled();
    };
  }, []);

  // Resto do componente...
}
```

### Integração com Analytics

```typescript
import analytics from '@react-native-firebase/analytics';

useEffect(() => {
  const unsubscribe = AditumSdk.onPaymentSuccess(async (result) => {
    // Enviar evento para Firebase Analytics
    await analytics().logEvent('payment_success', {
      transaction_id: result.transactionId,
      value: result.amount,
      currency: 'BRL',
      installments: result.installments,
      payment_method: result.paymentMethod,
    });

    // Enviar para backend
    await fetch('https://api.seubackend.com/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
  });

  return () => unsubscribe();
}, []);
```

---

## Tratamento de Erros

### Retry Automático

```typescript
async function processPaymentWithRetry(
  paymentData: PaymentData,
  maxRetries: number = 3
): Promise<PaymentResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentativa ${attempt} de ${maxRetries}`);
      return await AditumSdk.processPayment(paymentData);
    } catch (error: any) {
      lastError = error;

      // Não fazer retry se for cancelamento pelo usuário
      if (error.message?.includes('cancelado')) {
        throw error;
      }

      // Aguardar antes da próxima tentativa (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Falha após ${maxRetries} tentativas: ${lastError?.message}`);
}
```

### Erros Personalizados

```typescript
class PaymentTimeoutError extends Error {
  constructor(orderId: string) {
    super(`Timeout ao processar pagamento ${orderId}`);
    this.name = 'PaymentTimeoutError';
  }
}

class InsufficientFundsError extends Error {
  constructor() {
    super('Saldo insuficiente');
    this.name = 'InsufficientFundsError';
  }
}

// Uso
try {
  await AditumSdk.processPayment(data);
} catch (error: any) {
  if (error.code === 'TIMEOUT') {
    throw new PaymentTimeoutError(data.orderId);
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    throw new InsufficientFundsError();
  }
  throw error;
}
```

---

## Formatação de Dados

### Usando as Funções Utilitárias

```typescript
import {
  formatCurrency,
  formatDocument,
  formatPhone,
} from './modules/AditumSdk/validation';

// Exibir valores
const amount = 150.50;
console.log(formatCurrency(amount)); // "R$ 150,50"

// Formatar CPF/CNPJ
const cpf = '12345678901';
console.log(formatDocument(cpf)); // "123.456.789-01"

const cnpj = '12345678000195';
console.log(formatDocument(cnpj)); // "12.345.678/0001-95"

// Formatar telefone
const phone = '11987654321';
console.log(formatPhone(phone)); // "(11) 98765-4321"
```

### Componente de Input Formatado

```typescript
import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { formatDocument } from './modules/AditumSdk/validation';

function CPFInput({ value, onChangeText }) {
  const [formatted, setFormatted] = useState('');

  const handleChange = (text: string) => {
    // Remove formatação
    const clean = text.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = clean.slice(0, 11);
    
    // Formata
    const formatted = formatDocument(limited);
    setFormatted(formatted);
    
    // Retorna valor limpo
    onChangeText(limited);
  };

  return (
    <TextInput
      value={formatted}
      onChangeText={handleChange}
      keyboardType="number-pad"
      placeholder="000.000.000-00"
      maxLength={14}
    />
  );
}
```

---

## Context Provider

### Criar um Provider Global

```typescript
// AditumProvider.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useAditumSdk } from './modules/AditumSdk/useAditumSdk';
import type { PaymentData, PaymentResult } from './modules/AditumSdk';

interface AditumContextValue {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  processPayment: (data: PaymentData) => Promise<PaymentResult>;
  cancelTransaction: (id: string) => Promise<void>;
}

const AditumContext = createContext<AditumContextValue | undefined>(undefined);

export function AditumProvider({ children }: { children: ReactNode }) {
  const sdk = useAditumSdk({
    config: {
      apiKey: process.env.ADITUM_API_KEY!,
      environment: __DEV__ ? 'sandbox' : 'production',
    },
    onPaymentSuccess: (result) => {
      console.log('Payment approved globally:', result.transactionId);
    },
  });

  return <AditumContext.Provider value={sdk}>{children}</AditumContext.Provider>;
}

export function useAditum() {
  const context = useContext(AditumContext);
  if (!context) {
    throw new Error('useAditum must be used within AditumProvider');
  }
  return context;
}
```

### Uso no App

```typescript
// App.tsx
import { AditumProvider } from './AditumProvider';

export default function App() {
  return (
    <AditumProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Payment" component={PaymentScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AditumProvider>
  );
}

// PaymentScreen.tsx
import { useAditum } from './AditumProvider';

function PaymentScreen() {
  const { processPayment, loading, initialized } = useAditum();

  const handlePay = async () => {
    await processPayment({
      amount: 100,
      orderId: 'ORDER-123',
    });
  };

  return (
    <Button
      title="Pagar"
      onPress={handlePay}
      disabled={!initialized || loading}
    />
  );
}
```

---

## Testes

### Mock do Módulo Nativo

```typescript
// __mocks__/AditumSdk.ts
export default {
  initialize: jest.fn().mockResolvedValue({
    status: 'success',
    environment: 'sandbox',
    initialized: true,
  }),

  processPayment: jest.fn().mockResolvedValue({
    status: 'success',
    transactionId: 'TXN-123456',
    authorizationCode: 'AUTH-789',
    amount: 100.0,
    message: 'Aprovado',
    orderId: 'ORDER-123',
    installments: 1,
  }),

  cancelTransaction: jest.fn().mockResolvedValue({
    status: 'cancelled',
    transactionId: 'TXN-123456',
  }),

  onPaymentSuccess: jest.fn().mockReturnValue(() => {}),
  onPaymentError: jest.fn().mockReturnValue(() => {}),
  onPaymentCancelled: jest.fn().mockReturnValue(() => {}),
};
```

### Teste do Hook

```typescript
// useAditumSdk.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAditumSdk } from './useAditumSdk';

jest.mock('./index');

describe('useAditumSdk', () => {
  it('should initialize SDK on mount', async () => {
    const { result } = renderHook(() =>
      useAditumSdk({
        config: { apiKey: 'test-key', environment: 'sandbox' },
      })
    );

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });
  });

  it('should process payment successfully', async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useAditumSdk({
        config: { apiKey: 'test-key' },
        onPaymentSuccess: onSuccess,
      })
    );

    await waitFor(() => expect(result.current.initialized).toBe(true));

    await act(async () => {
      await result.current.processPayment({
        amount: 100,
        orderId: 'ORDER-123',
      });
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.lastPaymentResult).toBeDefined();
  });
});
```

---

## 🎯 Melhores Práticas

### ✅ Sempre fazer:
- Validar dados antes de enviar
- Tratar erros específicos (timeout, cancelamento, etc)
- Usar o hook `useAditumSdk` para gerenciamento de estado
- Registrar eventos importantes (analytics, logs)
- Testar em ambiente sandbox antes de produção

### ❌ Nunca fazer:
- Processar pagamento sem validação
- Ignorar eventos de erro
- Hardcode de chaves de API no código
- Esquecer de fazer cleanup dos listeners
- Fazer retry de pagamentos cancelados pelo usuário

---

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@aditum.com.br
- 📚 Docs: https://docs.aditum.com.br
- 💬 Slack: #aditum-sdk

---

**Versão:** 1.0.0  
**Última atualização:** 2025
