@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo Using JAVA_HOME: %JAVA_HOME%
java -version
call gradlew.bat assembleDebug
echo.
echo ===================================
echo APK file location:
dir /s /b app\build\outputs\apk\debug\*.apk 2>nul
echo ===================================
