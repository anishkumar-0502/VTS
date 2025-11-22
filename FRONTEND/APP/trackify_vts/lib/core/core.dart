import 'package:flutter/foundation.dart';

class trackify_vts {
  // Base URLs for environments
  static const String prodBaseUrl = 'http://192.168.0.48:8787'; // Release
  static const String devBaseUrl = 'http://192.168.0.48:8787'; // Development
  static const String testingBaseUrl = 'http://192.168.0.48:8787'; // Testing

  // Socket URLs
  static const String prodSocketUrl = 'http://192.168.0.48:8787';
  static const String devSocketUrl = 'http://192.168.0.48:8787';
  static const String testingSocketUrl = 'http://192.168.0.48:8787';

  // Dynamic URLs based on environment
  static final String baseUrl = _getBaseUrl();
  static final String socketUrl = _getSocketioUrl();

  // Determine Base URL
  static String _getBaseUrl() {
    if (kDebugMode) {
      return testingBaseUrl;
    } else if (kProfileMode) {
      return devBaseUrl;
    } else if (kReleaseMode) {
      return prodBaseUrl;
    }
    return prodBaseUrl;
  }

  // Determine Socket URL
  static String _getSocketioUrl() {
    if (kDebugMode) {
      return testingSocketUrl;
    } else if (kProfileMode) {
      return devSocketUrl;
    } else if (kReleaseMode) {
      return prodSocketUrl;
    }
    return prodSocketUrl;
  }

  // Final WebSocket URL for Charging
  static String getSocketUrl(String chargerId, int connectorId) {
    return '${_getSocketioUrl()}/charging/$chargerId/$connectorId';
  }

  // OpenRouteService API Key
  static const String openRouteServiceApiKey =
      'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU1MDE2ODk0OTMwYjQ0YjViOGNjODMyOTYzYjI4NGZiIiwiaCI6Im11cm11cjY0In0=';
}
