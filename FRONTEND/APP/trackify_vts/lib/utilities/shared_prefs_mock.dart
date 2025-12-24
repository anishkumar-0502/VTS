class SharedPreferencesMock {
  static final SharedPreferencesMock _instance = SharedPreferencesMock._internal();
  final Map<String, dynamic> _data = {};

  SharedPreferencesMock._internal();

  factory SharedPreferencesMock() {
    return _instance;
  }

  static Future<SharedPreferencesMock> getInstance() async {
    return _instance;
  }

  bool? getBool(String key) => _data[key] as bool?;
  String? getString(String key) => _data[key] as String?;
  
  Future<bool> setBool(String key, bool value) async {
    _data[key] = value;
    return true;
  }

  Future<bool> setString(String key, String value) async {
    _data[key] = value;
    return true;
  }

  Future<bool> remove(String key) async {
    _data.remove(key);
    return true;
  }

  Future<bool> clear() async {
    _data.clear();
    return true;
  }
}
