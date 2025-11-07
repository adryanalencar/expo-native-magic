package com.yourapp.aditum;

import android.app.Activity;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import br.com.aditum.data.v2.AditumSdkIntegration;
import br.com.aditum.data.v2.request.PaymentRequest;
import br.com.aditum.data.v2.response.PaymentResponse;
import br.com.aditum.data.v2.callback.PaymentCallback;

import java.util.HashMap;
import java.util.Map;

public class AditumSdkModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "AditumSdk";
    private static final String TAG = "AditumSdk";
    private final ReactApplicationContext reactContext;
    private boolean isInitialized = false;

    // Eventos que podem ser emitidos
    private static final String EVENT_PAYMENT_STARTED = "onPaymentStarted";
    private static final String EVENT_PAYMENT_PROCESSING = "onPaymentProcessing";
    private static final String EVENT_PAYMENT_SUCCESS = "onPaymentSuccess";
    private static final String EVENT_PAYMENT_ERROR = "onPaymentError";
    private static final String EVENT_PAYMENT_CANCELLED = "onPaymentCancelled";

    public AditumSdkModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("EVENT_PAYMENT_STARTED", EVENT_PAYMENT_STARTED);
        constants.put("EVENT_PAYMENT_PROCESSING", EVENT_PAYMENT_PROCESSING);
        constants.put("EVENT_PAYMENT_SUCCESS", EVENT_PAYMENT_SUCCESS);
        constants.put("EVENT_PAYMENT_ERROR", EVENT_PAYMENT_ERROR);
        constants.put("EVENT_PAYMENT_CANCELLED", EVENT_PAYMENT_CANCELLED);
        return constants;
    }

    /**
     * Emite um evento para o JavaScript
     */
    private void sendEvent(String eventName, @Nullable WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        }
    }

    /**
     * Inicializa o SDK da Aditum
     * @param config - Configuração contendo apiKey, environment, etc
     * @param promise - Promise para retornar sucesso/erro ao React Native
     */
    @ReactMethod
    public void initialize(ReadableMap config, Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available");
                return;
            }

            if (!config.hasKey("apiKey") || config.getString("apiKey") == null) {
                promise.reject("INVALID_CONFIG", "API Key is required");
                return;
            }

            String apiKey = config.getString("apiKey");
            String environment = config.hasKey("environment") ? config.getString("environment") : "sandbox";
            boolean enableLogs = config.hasKey("enableLogs") && config.getBoolean("enableLogs");
            
            boolean isProduction = "production".equalsIgnoreCase(environment);
            
            Log.d(TAG, "Initializing Aditum SDK - Environment: " + environment);
            
            // Configurar o SDK
            AditumSdkIntegration.initialize(currentActivity, apiKey, isProduction);
            
            isInitialized = true;
            
            WritableMap result = Arguments.createMap();
            result.putString("status", "success");
            result.putString("environment", environment);
            result.putBoolean("initialized", true);
            
            promise.resolve(result);
            
            Log.d(TAG, "SDK initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize SDK", e);
            isInitialized = false;
            promise.reject("INIT_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Verifica se o SDK está inicializado
     */
    @ReactMethod
    public void isInitialized(Promise promise) {
        promise.resolve(isInitialized);
    }

    /**
     * Obtém a versão do SDK
     */
    @ReactMethod
    public void getVersion(Promise promise) {
        try {
            WritableMap version = Arguments.createMap();
            version.putString("sdk", "2.3.7");
            version.putString("wrapper", "1.0.0");
            promise.resolve(version);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage(), e);
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
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized. Call initialize() first.");
                return;
            }

            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available");
                return;
            }

            // Validações
            if (!paymentData.hasKey("amount")) {
                promise.reject("INVALID_DATA", "Amount is required");
                return;
            }

            if (!paymentData.hasKey("orderId")) {
                promise.reject("INVALID_DATA", "Order ID is required");
                return;
            }

            // Criar o objeto PaymentRequest a partir dos dados recebidos
            PaymentRequest request = new PaymentRequest();
            
            double amount = paymentData.getDouble("amount");
            if (amount <= 0) {
                promise.reject("INVALID_DATA", "Amount must be greater than zero");
                return;
            }
            request.setAmount(amount);
            
            int installments = paymentData.hasKey("installments") ? paymentData.getInt("installments") : 1;
            if (installments < 1 || installments > 12) {
                promise.reject("INVALID_DATA", "Installments must be between 1 and 12");
                return;
            }
            request.setInstallments(installments);
            
            String orderId = paymentData.getString("orderId");
            request.setOrderId(orderId);

            if (paymentData.hasKey("description")) {
                request.setDescription(paymentData.getString("description"));
            }

            if (paymentData.hasKey("customerName")) {
                request.setCustomerName(paymentData.getString("customerName"));
            }

            if (paymentData.hasKey("customerDocument")) {
                request.setCustomerDocument(paymentData.getString("customerDocument"));
            }

            if (paymentData.hasKey("customerEmail")) {
                request.setCustomerEmail(paymentData.getString("customerEmail"));
            }

            // Metadados adicionais
            if (paymentData.hasKey("metadata")) {
                ReadableMap metadata = paymentData.getMap("metadata");
                // Processar metadata conforme necessário
            }

            Log.d(TAG, "Processing payment - Order: " + orderId + ", Amount: " + amount);

            // Emitir evento de início
            WritableMap startEvent = Arguments.createMap();
            startEvent.putString("orderId", orderId);
            startEvent.putDouble("amount", amount);
            sendEvent(EVENT_PAYMENT_STARTED, startEvent);

            // Processar o pagamento
            AditumSdkIntegration.processPayment(currentActivity, request, new PaymentCallback() {
                @Override
                public void onSuccess(PaymentResponse response) {
                    Log.d(TAG, "Payment successful - Transaction: " + response.getTransactionId());
                    
                    WritableMap result = Arguments.createMap();
                    result.putString("status", "success");
                    result.putString("transactionId", response.getTransactionId());
                    result.putString("authorizationCode", response.getAuthorizationCode());
                    result.putDouble("amount", response.getAmount());
                    result.putString("message", response.getMessage());
                    result.putString("orderId", orderId);
                    result.putInt("installments", installments);
                    
                    if (response.getPaymentMethod() != null) {
                        result.putString("paymentMethod", response.getPaymentMethod());
                    }
                    
                    if (response.getCardBrand() != null) {
                        result.putString("cardBrand", response.getCardBrand());
                    }
                    
                    if (response.getLastFourDigits() != null) {
                        result.putString("lastFourDigits", response.getLastFourDigits());
                    }

                    // Emitir evento de sucesso
                    sendEvent(EVENT_PAYMENT_SUCCESS, result);
                    
                    promise.resolve(result);
                }

                @Override
                public void onError(String errorCode, String errorMessage) {
                    Log.e(TAG, "Payment error - Code: " + errorCode + ", Message: " + errorMessage);
                    
                    WritableMap error = Arguments.createMap();
                    error.putString("code", errorCode);
                    error.putString("message", errorMessage);
                    error.putString("orderId", orderId);
                    
                    // Emitir evento de erro
                    sendEvent(EVENT_PAYMENT_ERROR, error);
                    
                    promise.reject(errorCode, errorMessage, error);
                }

                @Override
                public void onCancelled() {
                    Log.d(TAG, "Payment cancelled by user");
                    
                    WritableMap cancelEvent = Arguments.createMap();
                    cancelEvent.putString("orderId", orderId);
                    cancelEvent.putString("reason", "User cancelled the payment");
                    
                    // Emitir evento de cancelamento
                    sendEvent(EVENT_PAYMENT_CANCELLED, cancelEvent);
                    
                    promise.reject("CANCELLED", "Payment was cancelled by user", cancelEvent);
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "Failed to process payment", e);
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
    public void getTransactionStatus(String transactionId, Promise promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized");
                return;
            }

            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available");
                return;
            }

            Log.d(TAG, "Checking transaction status: " + transactionId);

            // Implementar lógica de consulta de status
            // Nota: Isso depende se o SDK Aditum oferece esse método
            WritableMap status = Arguments.createMap();
            status.putString("transactionId", transactionId);
            status.putString("message", "Status check not available in current SDK version");
            promise.resolve(status);

        } catch (Exception e) {
            Log.e(TAG, "Failed to check transaction status", e);
            promise.reject("STATUS_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Obtém lista de métodos de pagamento disponíveis
     */
    @ReactMethod
    public void getAvailablePaymentMethods(Promise promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized");
                return;
            }

            WritableArray methods = Arguments.createArray();
            
            WritableMap credit = Arguments.createMap();
            credit.putString("type", "credit");
            credit.putString("name", "Cartão de Crédito");
            credit.putInt("maxInstallments", 12);
            methods.pushMap(credit);
            
            WritableMap debit = Arguments.createMap();
            debit.putString("type", "debit");
            debit.putString("name", "Cartão de Débito");
            debit.putInt("maxInstallments", 1);
            methods.pushMap(debit);

            promise.resolve(methods);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage(), e);
        }
    }

    /**
     * Limpa o cache e reseta o estado do SDK
     */
    @ReactMethod
    public void reset(Promise promise) {
        try {
            Log.d(TAG, "Resetting SDK");
            isInitialized = false;
            promise.resolve("SDK reset successfully");
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage(), e);
        }
    }
}
