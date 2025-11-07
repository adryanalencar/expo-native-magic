package com.yourapp.aditum;

import android.app.Activity;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

import br.com.aditum.data.v2.AditumSdkIntegration;
import br.com.aditum.data.v2.request.PaymentRequest;
import br.com.aditum.data.v2.response.PaymentResponse;
import br.com.aditum.data.v2.callback.PaymentCallback;

public class AditumSdkModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "AditumSdk";
    private final ReactApplicationContext reactContext;

    public AditumSdkModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Inicializa o SDK da Aditum
     * @param apiKey - Chave da API fornecida pela Aditum
     * @param environment - "production" ou "sandbox"
     * @param promise - Promise para retornar sucesso/erro ao React Native
     */
    @ReactMethod
    public void initialize(String apiKey, String environment, Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("ERROR", "Activity not available");
                return;
            }

            // Configurar o SDK
            boolean isProduction = environment.equals("production");
            AditumSdkIntegration.initialize(currentActivity, apiKey, isProduction);
            
            promise.resolve("SDK initialized successfully");
        } catch (Exception e) {
            promise.reject("INIT_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Processa um pagamento
     * @param paymentData - Dados do pagamento (valor, parcelas, etc)
     * @param promise - Promise que retorna o resultado do pagamento
     */
    @ReactMethod
    public void processPayment(ReadableMap paymentData, Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("ERROR", "Activity not available");
                return;
            }

            // Criar o objeto PaymentRequest a partir dos dados recebidos
            PaymentRequest request = new PaymentRequest();
            
            if (paymentData.hasKey("amount")) {
                request.setAmount(paymentData.getDouble("amount"));
            }
            
            if (paymentData.hasKey("installments")) {
                request.setInstallments(paymentData.getInt("installments"));
            }
            
            if (paymentData.hasKey("orderId")) {
                request.setOrderId(paymentData.getString("orderId"));
            }

            if (paymentData.hasKey("description")) {
                request.setDescription(paymentData.getString("description"));
            }

            // Processar o pagamento
            AditumSdkIntegration.processPayment(currentActivity, request, new PaymentCallback() {
                @Override
                public void onSuccess(PaymentResponse response) {
                    WritableMap result = new WritableNativeMap();
                    result.putString("status", "success");
                    result.putString("transactionId", response.getTransactionId());
                    result.putString("authorizationCode", response.getAuthorizationCode());
                    result.putDouble("amount", response.getAmount());
                    result.putString("message", response.getMessage());
                    promise.resolve(result);
                }

                @Override
                public void onError(String errorCode, String errorMessage) {
                    WritableMap error = new WritableNativeMap();
                    error.putString("code", errorCode);
                    error.putString("message", errorMessage);
                    promise.reject("PAYMENT_ERROR", errorMessage, error);
                }

                @Override
                public void onCancelled() {
                    promise.reject("CANCELLED", "Payment was cancelled by user");
                }
            });

        } catch (Exception e) {
            promise.reject("PROCESS_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Cancela uma transação
     * @param transactionId - ID da transação a ser cancelada
     * @param promise - Promise que retorna o resultado
     */
    @ReactMethod
    public void cancelTransaction(String transactionId, Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("ERROR", "Activity not available");
                return;
            }

            AditumSdkIntegration.cancelTransaction(currentActivity, transactionId, new PaymentCallback() {
                @Override
                public void onSuccess(PaymentResponse response) {
                    WritableMap result = new WritableNativeMap();
                    result.putString("status", "cancelled");
                    result.putString("transactionId", transactionId);
                    promise.resolve(result);
                }

                @Override
                public void onError(String errorCode, String errorMessage) {
                    promise.reject("CANCEL_ERROR", errorMessage);
                }

                @Override
                public void onCancelled() {
                    promise.resolve("Transaction cancellation completed");
                }
            });

        } catch (Exception e) {
            promise.reject("CANCEL_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Verifica o status de uma transação
     * @param transactionId - ID da transação
     * @param promise - Promise que retorna o status
     */
    @ReactMethod
    public void checkTransactionStatus(String transactionId, Promise promise) {
        try {
            // Implementar lógica de consulta de status
            // Isso depende da API específica do SDK
            promise.reject("NOT_IMPLEMENTED", "Method not implemented yet");
        } catch (Exception e) {
            promise.reject("STATUS_ERROR", e.getMessage(), e);
        }
    }
}
