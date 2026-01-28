# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
# --- INICIO REGLAS BACKGROUND Y GEO ---

# Evitar que se rompa react-native-background-actions
-keep class com.asterinet.react.bgactions.** { *; }
-keep class com.asterinet.react.bgactions.RNBackgroundActionsTask { *; }

# Evitar que se rompa react-native-geolocation-service
-keep class com.agontuk.RNFusedLocation.** { *; }
-keep class com.google.android.gms.location.** { *; }

# Mantener clases genéricas de React Native (por seguridad)
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Si usas Vector Icons (para el ícono de la notificación)
-keep class com.oblador.vectoricons.** { *; }

# --- FIN REGLAS ---