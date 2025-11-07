# 🚀 Wrapper React Native para Aditum SDK

[![NPM Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://www.npmjs.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

Wrapper **completo** e **profissional** para integração da biblioteca nativa Aditum SDK em projetos React Native, com suporte total a TypeScript, validação robusta, hooks React e eventos em tempo real.

## ✨ Funcionalidades

- ✅ **TypeScript nativo** com tipagem completa
- ✅ **Validação automática** com Zod
- ✅ **Hook React personalizado** (`useAditumSdk`)
- ✅ **Eventos em tempo real** (onPaymentSuccess, onPaymentError, etc)
- ✅ **Tratamento de erros robusto**
- ✅ **Formatação de dados** (CPF, telefone, moeda)
- ✅ **Suporte a múltiplos métodos de pagamento**
- ✅ **Cancelamento de transações**
- ✅ **Consulta de status**

## 📋 Pré-requisitos

- ✅ Projeto React Native (Bare Workflow, **não Expo gerenciado**)
- ✅ Android Studio instalado
- ✅ Arquivo `AditumSdkIntegration.aar` fornecido pela Aditum
- ✅ Node.js >= 16
- ✅ React Native >= 0.70

## 🚀 Instalação

### 1. Adicione o arquivo .aar ao projeto

```bash
# Copie o arquivo .aar para a pasta libs
cp AditumSdkIntegration.aar android/app/libs/
```

### 2. Configure o build.gradle

Edite `android/app/build.gradle` e adicione:

```gradle
dependencies {
    // ... outras dependências
    
    // Adicione esta linha para incluir todos os .aar da pasta libs
    implementation fileTree(dir: 'libs', include: ['*.aar'])
}
```

### 3. Adicione os arquivos Java do wrapper

Copie os arquivos para a estrutura do seu projeto:

```
android/app/src/main/java/com/yourapp/aditum/
├── AditumSdkModule.java
└── AditumSdkPackage.java
```

**IMPORTANTE**: Substitua `com.yourapp` pelo package name do seu app (encontrado em `android/app/src/main/java/com/[seu-package]`)

### 4. Registre o módulo no MainApplication.java

Edite `android/app/src/main/java/com/[seu-package]/MainApplication.java`:

```java
import com.yourapp.aditum.AditumSdkPackage; // Adicione este import

public class MainApplication extends Application implements ReactApplication {

  @Override
  protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    
    // Adicione esta linha:
    packages.add(new AditumSdkPackage());
    
    return packages;
  }
}
```

### 5. Instale as dependências do wrapper

```bash
npm install zod
# ou
yarn add zod
```

### 6. Copie os arquivos do wrapper

Copie os arquivos TypeScript para o diretório do seu projeto:

```
src/modules/AditumSdk/
├── index.ts            # Wrapper principal
├── useAditumSdk.ts     # Hook React
├── validation.ts       # Validações com Zod
└── package.json        # Metadados

### 7. Recompile o app

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

---

## 💡 Como Usar

### Opção 1: Usando o Hook `useAditumSdk` (Recomendado)

```typescript
import React from 'react';
import { View, Button, Text, ActivityIndicator, Alert } from 'react-native';
import { useAditumSdk } from './modules/AditumSdk/useAditumSdk';

export default function PaymentScreen() {
  const {
    initialized,
    loading,
    error,
    processPayment,
    lastPaymentResult,
  } = useAditumSdk({
    config: {
      apiKey: 'SUA_API_KEY_AQUI',
      environment: 'sandbox',
      enableLogs: __DEV__,
    },
    onPaymentSuccess: (result) => {
      Alert.alert(
        'Pagamento Aprovado! ✅',
        `Transação: ${result.transactionId}\nValor: R$ ${result.amount.toFixed(2)}`
      );
    },
    onPaymentError: (error) => {
      Alert.alert('Erro no Pagamento', error.message);
    },
    onPaymentCancelled: (data) => {
      Alert.alert('Pagamento Cancelado', data.reason);
    },
  });

  const handlePay = async () => {
    try {
      await processPayment({
        amount: 100.50,
        installments: 3,
        orderId: `ORDER-${Date.now()}`,
        description: 'Compra de produto XYZ',
        customerName: 'João Silva',
        customerEmail: 'joao@email.com',
      });
    } catch (error: any) {
      console.error('Erro:', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      {/* Status */}
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Status: {initialized ? '✅ Conectado' : '⏳ Conectando...'}
      </Text>

      {/* Erro */}
      {error && (
        <Text style={{ color: 'red', marginBottom: 10 }}>
          ⚠️ {error}
        </Text>
      )}

      {/* Loading */}
      {loading && <ActivityIndicator size="large" />}

      {/* Botão de pagamento */}
      <Button
        title="💳 Pagar R$ 100,50"
        onPress={handlePay}
        disabled={!initialized || loading}
      />

      {/* Último resultado */}
      {lastPaymentResult && (
        <View style={{ marginTop: 20, padding: 10, backgroundColor: '#e8f5e9' }}>
          <Text>✅ Último pagamento aprovado</Text>
          <Text>ID: {lastPaymentResult.transactionId}</Text>
        </View>
      )}
    </View>
  );
}
```

### Opção 2: Usando o SDK Diretamente

```typescript
import React, { useEffect, useState } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import AditumSdk from './modules/AditumSdk';

export default function PaymentScreen() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await AditumSdk.initialize({
          apiKey: 'SUA_API_KEY_AQUI',
          environment: 'sandbox',
          enableLogs: true,
        });
        setInitialized(true);
      } catch (error: any) {
        Alert.alert('Erro', error.message);
      }
    }

    init();
  }, []);

  const handlePayment = async () => {
    try {
      const result = await AditumSdk.processPayment({
        amount: 150.00,
        installments: 2,
        orderId: 'ORDER-12345',
        description: 'Compra de teste',
      });

      Alert.alert('Sucesso!', `Transação: ${result.transactionId}`);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Button
        title="Processar Pagamento"
        onPress={handlePayment}
        disabled={!initialized}
      />
    </View>
  );
}
```

### Exemplo com TypeScript

```typescript
import AditumSdk, { PaymentData, PaymentResult } from './modules/AditumSdk';

const processPayment = async (): Promise<void> => {
  const paymentData: PaymentData = {
    amount: 250.00,
    installments: 3,
    orderId: 'ORDER-12345',
    description: 'Produto XYZ'
  };

  try {
    const result: PaymentResult = await AditumSdk.processPayment(paymentData);
    console.log('Pagamento aprovado:', result.transactionId);
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

### Cancelar Transação

```javascript
const cancelPayment = async (transactionId) => {
  try {
    await AditumSdk.cancelTransaction(transactionId);
    Alert.alert('Sucesso', 'Transação cancelada');
  } catch (error) {
    Alert.alert('Erro', 'Não foi possível cancelar a transação');
  }
};
```

## 🔧 Troubleshooting

### "AditumSdk module not found"
- Verifique se você registrou o `AditumSdkPackage` no `MainApplication.java`
- Recompile o app: `npx react-native run-android`

### Erros de compilação do Gradle
- Certifique-se de que o arquivo `.aar` está em `android/app/libs/`
- Limpe o build: `cd android && ./gradlew clean`

### "Activity not available"
- Este erro ocorre quando você tenta processar pagamento antes do app estar totalmente carregado
- Certifique-se de inicializar o SDK no `useEffect`

## 📝 Notas Importantes

1. **Permissões**: Adicione as permissões necessárias no `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.NFC" />
```

2. **Versão Mínima do Android**: A biblioteca Aditum pode exigir API level 21+ (Android 5.0)

3. **ProGuard**: Se você usa ProGuard/R8, adicione regras para manter as classes da Aditum:
```proguard
-keep class br.com.aditum.** { *; }
```

## 📚 Referências

- [Documentação React Native - Native Modules](https://reactnative.dev/docs/native-modules-android)
- [Documentação Aditum](https://docs.aditum.com.br/)

## ⚠️ Aviso

Este wrapper é um exemplo básico. Você precisará adaptá-lo conforme:
- A documentação oficial da Aditum
- Os métodos reais disponíveis no SDK
- Suas necessidades específicas de negócio
