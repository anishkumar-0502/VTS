class GetLoginResponse {
  final bool error; // Updated to match the response structure
  final String message; // Message field
  final Map<String, dynamic>? data;

  GetLoginResponse({
    required this.error,
    required this.message,
    this.data,
  });

  // Factory constructor for creating an instance from JSON
  factory GetLoginResponse.fromJson(Map<String, dynamic> json) {
    return GetLoginResponse(
      error: json['error'] as bool, // Parse 'error' field
      message: json['message'] as String, // Parse 'message' field
      data: json['data'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['data'] as Map)
          : null,
    );
  }

  // Method to convert the instance back to JSON
  Map<String, dynamic> toJson() {
    return {
      'error': error,
      'message': message,
      'data': data,
    };
  }
}