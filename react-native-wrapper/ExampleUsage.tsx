/**
 * Exemplo completo de uso do wrapper Aditum SDK
 * 
 * Este componente React Native demonstra como integrar pagamentos
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AditumSdk, { PaymentData, PaymentResult } from './index';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  date: Date;
}

export default function AditumPaymentExample() {
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Dados do formulário
  const [amount, setAmount] = useState('100.00');
  const [installments, setInstallments] = useState('1');
  const [description, setDescription] = useState('Pagamento de teste');

  // Inicializar SDK quando o componente montar
  useEffect(() => {
    initializeSDK();
  }, []);

  const initializeSDK = async () => {
    try {
      setLoading(true);
      
      // IMPORTANTE: Substitua pela sua chave de API real
      const apiKey = 'SUA_CHAVE_API_AQUI';
      const environment = __DEV__ ? 'sandbox' : 'production';
      
      await AditumSdk.initialize(apiKey, environment);
      
      setSdkInitialized(true);
      console.log('✅ SDK Aditum inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar SDK:', error);
      Alert.alert(
        'Erro de Inicialização',
        'Não foi possível conectar ao serviço de pagamento. Verifique sua conexão.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!sdkInitialized) {
      Alert.alert('Erro', 'SDK de pagamento não está pronto');
      return;
    }

    // Validações básicas
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    const installmentsValue = parseInt(installments);
    if (isNaN(installmentsValue) || installmentsValue < 1) {
      Alert.alert('Erro', 'Número de parcelas inválido');
      return;
    }

    try {
      setLoading(true);

      const paymentData: PaymentData = {
        amount: amountValue,
        installments: installmentsValue,
        orderId: `ORDER-${Date.now()}`,
        description: description || 'Pagamento',
      };

      console.log('🔄 Processando pagamento:', paymentData);

      const result: PaymentResult = await AditumSdk.processPayment(paymentData);

      console.log('✅ Pagamento aprovado:', result);

      // Adicionar à lista de transações
      const newTransaction: Transaction = {
        id: result.transactionId,
        amount: result.amount,
        status: 'Aprovado',
        date: new Date(),
      };
      setTransactions([newTransaction, ...transactions]);

      // Mostrar sucesso
      Alert.alert(
        '✅ Pagamento Aprovado!',
        `Transação: ${result.transactionId}\n` +
        `Código de Autorização: ${result.authorizationCode}\n` +
        `Valor: R$ ${result.amount.toFixed(2)}\n` +
        `Mensagem: ${result.message}`,
        [{ text: 'OK', onPress: clearForm }]
      );

    } catch (error: any) {
      console.error('❌ Erro no pagamento:', error);
      
      let errorMessage = 'Não foi possível processar o pagamento';
      if (error.code === 'CANCELLED') {
        errorMessage = 'Pagamento cancelado pelo usuário';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Erro no Pagamento', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransaction = async (transactionId: string) => {
    Alert.alert(
      'Cancelar Transação',
      'Tem certeza que deseja cancelar esta transação?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await AditumSdk.cancelTransaction(transactionId);
              
              // Atualizar lista de transações
              setTransactions(prev =>
                prev.map(t =>
                  t.id === transactionId
                    ? { ...t, status: 'Cancelado' }
                    : t
                )
              );
              
              Alert.alert('Sucesso', 'Transação cancelada');
            } catch (error) {
              console.error('Erro ao cancelar:', error);
              Alert.alert('Erro', 'Não foi possível cancelar a transação');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const clearForm = () => {
    setAmount('100.00');
    setInstallments('1');
    setDescription('Pagamento de teste');
  };

  if (loading && !sdkInitialized) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Inicializando SDK de pagamento...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pagamento Aditum</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: sdkInitialized ? '#34C759' : '#FF3B30' }]} />
          <Text style={styles.statusText}>
            {sdkInitialized ? 'Conectado' : 'Desconectado'}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Valor (R$)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          editable={!loading}
        />

        <Text style={styles.label}>Número de Parcelas</Text>
        <TextInput
          style={styles.input}
          value={installments}
          onChangeText={setInstallments}
          keyboardType="number-pad"
          placeholder="1"
          editable={!loading}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição do pagamento"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, (!sdkInitialized || loading) && styles.buttonDisabled]}
          onPress={handleProcessPayment}
          disabled={!sdkInitialized || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>💳 Processar Pagamento</Text>
          )}
        </TouchableOpacity>
      </View>

      {transactions.length > 0 && (
        <View style={styles.transactionsContainer}>
          <Text style={styles.transactionsTitle}>Transações Recentes</Text>
          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionId} numberOfLines={1}>
                  {transaction.id}
                </Text>
                <Text style={styles.transactionAmount}>
                  R$ {transaction.amount.toFixed(2)}
                </Text>
                <Text style={styles.transactionDate}>
                  {transaction.date.toLocaleString('pt-BR')}
                </Text>
              </View>
              <View style={styles.transactionActions}>
                <View
                  style={[
                    styles.statusBadgeSmall,
                    { backgroundColor: transaction.status === 'Aprovado' ? '#34C759' : '#FF3B30' },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{transaction.status}</Text>
                </View>
                {transaction.status === 'Aprovado' && (
                  <TouchableOpacity
                    onPress={() => handleCancelTransaction(transaction.id)}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButton}>Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  form: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F5F5F7',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsContainer: {
    margin: 16,
  },
  transactionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  transactionCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionActions: {
    alignItems: 'flex-end',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
});
