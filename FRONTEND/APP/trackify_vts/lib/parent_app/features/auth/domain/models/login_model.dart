class GetLoginResponse {
  final bool error;
  final String message;
  final Map<String, dynamic>? data;

  GetLoginResponse({
    required this.error,
    required this.message,
    this.data,
  });

  factory GetLoginResponse.fromJson(Map<String, dynamic> json) {
    return GetLoginResponse(
      error: json['error'] as bool,
      message: json['message'] as String,
      data: json['data'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['data'] as Map)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'error': error,
      'message': message,
      'data': data,
    };
  }
}
