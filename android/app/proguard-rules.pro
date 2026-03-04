# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.shenanigans.jiujitsu.** { *; }
-keepattributes *Annotation*

# WebView JavaScript bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
