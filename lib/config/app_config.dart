class AppConfig {
  static const String appName = 'NearCheck+';
  static const String fontFamily = 'Poppins';
  
  // Firebase config - these will be loaded from .env
  static const String firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const String firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const String firebaseAppId = String.fromEnvironment('FIREBASE_APP_ID');
  
  // Location settings
  static const double defaultCheckInRadius = 50.0; // meters
  static const Duration autoCheckInInterval = Duration(minutes: 1);
  static const Duration maxSessionDuration = Duration(hours: 12);
  
  // UI settings
  static const double buttonBorderRadius = 12.0;
  static const double cardBorderRadius = 16.0;
  static const Duration animationDuration = Duration(milliseconds: 300);
}
