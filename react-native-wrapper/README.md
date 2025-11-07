# Wrapper React Native para Aditum SDK

Este wrapper permite usar a biblioteca nativa Aditum (.aar) em projetos React Native.

## 📋 Pré-requisitos

- Projeto React Native (Bare Workflow, não Expo gerenciado)
- Android Studio instalado
- Arquivo `AditumSdkIntegration.aar` fornecido pela Aditum

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

### 5. Copie o arquivo JavaScript

Copie `index.js` para o diretório do seu projeto (ex: `src/modules/AditumSdk/index.js`)

### 6. Recompile o app

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## 💡 Como Usar

### Exemplo Básico

```javascript
import React, { useEffect, useState } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import AditumSdk from './modules/AditumSdk';

export default function PaymentScreen() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Inicializar o SDK quando o componente montar
    async function init() {
      try {
        await AditumSdk.initialize(
          'SUA_API_KEY_AQUI',
          'sandbox' // ou 'production'
        );
        setInitialized(true);
        console.log('SDK inicializado com sucesso!');
      } catch (error) {
        console.error('Erro ao inicializar SDK:', error);
        Alert.alert('Erro', 'Não foi possível inicializar o SDK de pagamento');
      }
    }

    init();
  }, []);

  const handlePayment = async () => {
    if (!initialized) {
      Alert.alert('Erro', 'SDK não inicializado');
      return;
    }

    try {
      const result = await AditumSdk.processPayment({
        amount: 100.50,
        installments: 1,
        orderId: `ORDER-${Date.now()}`,
        description: 'Compra de teste'
      });

      Alert.alert(
        'Pagamento Aprovado!',
        `Transação: ${result.transactionId}\nValor: R$ ${result.amount}`
      );
    } catch (error) {
      console.error('Erro no pagamento:', error);
      Alert.alert('Erro', error.message || 'Falha ao processar pagamento');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Status do SDK: {initialized ? '✅ Pronto' : '⏳ Inicializando...'}
      </Text>
      
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
