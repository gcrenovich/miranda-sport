package com.mirandasport.app;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.InputType;
import android.util.Log;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String DEFAULT_PROD_URL = "https://mirandasport.onrender.com";
    private static final String DEFAULT_LOCAL_URL = "http://10.0.2.2:3000";
    private static final String PREFS_NAME = "MirandaPrefs";
    private static final String KEY_SERVER_URL = "server_url";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        
        // Configure WebSettings for full HTML5 compatibility
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);

        // Configure fallback redirections and error handler
        webView.setWebViewClient(new WebViewClient() {
            private boolean isFallbackRedirected = false;

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                    view.loadUrl(request.getUrl().toString());
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                handleConnectionError(view, failingUrl);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    if (request.isForMainFrame()) {
                        handleConnectionError(view, request.getUrl().toString());
                    }
                }
            }

            private void handleConnectionError(WebView view, String failingUrl) {
                if (!isFallbackRedirected && failingUrl != null && failingUrl.startsWith(DEFAULT_LOCAL_URL)) {
                    isFallbackRedirected = true;
                    Log.w("MirandaSport", "Servidor local inaccesible (" + DEFAULT_LOCAL_URL + "). Redirigiendo a producción...");
                    Toast.makeText(MainActivity.this, "Servidor local inaccesible. Cargando producción...", Toast.LENGTH_LONG).show();
                    view.loadUrl(DEFAULT_PROD_URL);
                }
            }
        });

        // Set developer/tester tool: Configure custom URL on long press
        webView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                showUrlConfigDialog();
                return true;
            }
        });

        // Load targeted server URL
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String serverUrl = prefs.getString(KEY_SERVER_URL, "");
        if (serverUrl.isEmpty()) {
            serverUrl = isEmulator() ? DEFAULT_LOCAL_URL : DEFAULT_PROD_URL;
        }

        Log.d("MirandaSport", "Iniciando carga de URL: " + serverUrl);
        webView.loadUrl(serverUrl);
    }

    private void showUrlConfigDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Configurar Servidor (Dev)");
        builder.setMessage("Ingrese la dirección URL del servidor de Miranda Sport:");

        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String currentUrl = prefs.getString(KEY_SERVER_URL, "");
        if (currentUrl.isEmpty()) {
            currentUrl = isEmulator() ? DEFAULT_LOCAL_URL : DEFAULT_PROD_URL;
        }
        input.setText(currentUrl);
        builder.setView(input);

        builder.setPositiveButton("Guardar y Recargar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String newUrl = input.getText().toString().trim();
                if (!newUrl.isEmpty()) {
                    SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();
                    editor.putString(KEY_SERVER_URL, newUrl);
                    editor.apply();
                    webView.loadUrl(newUrl);
                    Toast.makeText(MainActivity.this, "Servidor actualizado a: " + newUrl, Toast.LENGTH_SHORT).show();
                }
            }
        });

        builder.setNegativeButton("Cancelar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.cancel();
            }
        });

        builder.setNeutralButton("Restablecer", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();
                editor.remove(KEY_SERVER_URL);
                editor.apply();
                
                String fallbackUrl = isEmulator() ? DEFAULT_LOCAL_URL : DEFAULT_PROD_URL;
                webView.loadUrl(fallbackUrl);
                Toast.makeText(MainActivity.this, "Restablecido a: " + fallbackUrl, Toast.LENGTH_SHORT).show();
            }
        });

        builder.show();
    }

    private boolean isEmulator() {
        return (android.os.Build.BRAND.startsWith("generic") && android.os.Build.DEVICE.startsWith("generic"))
                || android.os.Build.FINGERPRINT.startsWith("generic")
                || android.os.Build.FINGERPRINT.startsWith("unknown")
                || android.os.Build.HARDWARE.contains("goldfish")
                || android.os.Build.HARDWARE.contains("ranchu")
                || android.os.Build.MODEL.contains("google_sdk")
                || android.os.Build.MODEL.contains("Emulator")
                || android.os.Build.MODEL.contains("Android SDK built for x86")
                || android.os.Build.MANUFACTURER.contains("Genymotion")
                || android.os.Build.PRODUCT.contains("sdk_google")
                || android.os.Build.PRODUCT.contains("google_sdk")
                || android.os.Build.PRODUCT.contains("sdk")
                || android.os.Build.PRODUCT.contains("sdk_x86")
                || android.os.Build.PRODUCT.contains("vbox86p")
                || android.os.Build.PRODUCT.contains("emulator")
                || android.os.Build.PRODUCT.contains("simulator");
    }

    // Override back button behavior to navigate back within WebView instead of exiting the app
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
