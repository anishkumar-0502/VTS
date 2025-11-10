import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

class InternetStatusNotifier {
  InternetStatusNotifier._() {
    _init();
  }

  static final InternetStatusNotifier instance = InternetStatusNotifier._();
  final ValueNotifier<bool> isOnline = ValueNotifier(true);

  void _init() {
    Connectivity().onConnectivityChanged.listen((result) {
      final connected = result != ConnectivityResult.none;
      isOnline.value = connected;
    });

    Connectivity().checkConnectivity().then((result) {
      isOnline.value = result != ConnectivityResult.none;
    });
  }
}
