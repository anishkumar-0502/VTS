import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:geocoding/geocoding.dart';
import 'package:http/http.dart' as http;

import '../../../../../core/core.dart';
import '../../../../Sessionhandler/session_controller.dart';
import '../bindings/child_location_tracking_binding.dart';
import 'child_location_tracking_page.dart';
import '../../../../shared/index.dart';
import '../../../../shared/widgets/shimmer_skeletons.dart';

class LiveTrackingChildrenPage extends StatefulWidget {
  const LiveTrackingChildrenPage({super.key});

  @override
  State<LiveTrackingChildrenPage> createState() =>
      _LiveTrackingChildrenPageState();
}

class _LiveTrackingChildrenPageState extends State<LiveTrackingChildrenPage> {
  final SessionController sessionController = Get.find<SessionController>();
  
  Map<String, dynamic>? profileData;
  bool isLoading = true;
  String errorMessage = '';

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    try {
      setState(() {
        isLoading = true;
        errorMessage = '';
      });

      final token = sessionController.token.value;
      if (token.isEmpty) {
        throw Exception('Token not found');
      }

      final response = await http.get(
        Uri.parse('${trackify_vts.baseUrl}/parent/profile'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        setState(() {
          profileData = jsonData['data'];
          isLoading = false;
        });
      } else {
        throw Exception('Failed to fetch profile');
      }
    } catch (e) {
      setState(() {
        errorMessage = 'Error: ${e.toString()}';
        isLoading = false;
      });
    }
  }

  Future<String> _getAddressFromLatLng(double lat, double lng) async {
    try {
      if (lat == 0.0 && lng == 0.0) {
        return "Location unavailable";
      }
      List<Placemark> placemarks = await placemarkFromCoordinates(lat, lng);
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        return "${p.locality}, ${p.administrativeArea}";
      }
    } catch (e) {
      return "Unknown Location";
    }
    return "Unknown Location";
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    return ParentAppLayout(
      appBar: AppBar(
        backgroundColor: primaryColor,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          'Live Tracking',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: isLoading
          ? const LiveTrackingListSkeleton()
          : errorMessage.isNotEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline,
                            color: Colors.red.shade700, size: 48),
                        const SizedBox(height: 16),
                        Text(
                          errorMessage,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: Colors.red.shade700, fontSize: 14),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: _fetchProfile,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildChildrenList(theme, primaryColor),
    );
  }

  Widget _buildChildrenList(ThemeData theme, Color primaryColor) {
    final associatedUsers =
        (profileData?['associated_users'] as List?) ?? [];
    final endUserId = profileData?['end_user_id'] as String? ?? '';

    if (associatedUsers.isEmpty && endUserId.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              'No children to track',
              style: theme.textTheme.titleLarge
                  ?.copyWith(color: Colors.grey.shade600),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchProfile,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ...associatedUsers.map((user) {
            return _buildChildCard(
              name: user['name'] as String? ?? 'Unknown',
              childId: user['id'] as String? ?? endUserId,
              theme: theme,
              primaryColor: primaryColor,
            );
          }),
        ],
      ),
    );
  }

  Widget _buildChildCard({
    required String name,
    required String childId,
    required ThemeData theme,
    required Color primaryColor,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: primaryColor,
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      FutureBuilder<String>(
                        future: _fetchTripStatus(childId),
                        builder: (context, snapshot) {
                          if (snapshot.connectionState ==
                              ConnectionState.waiting) {
                            return ShimmerLoadingSkeleton(
                              width: 70,
                              height: 12,
                            );
                          }
                          final status = snapshot.data ?? 'Unknown';
                          final isOnTrip = status.contains('on trip') ||
                              status.contains('On Trip') ||
                              status.toLowerCase().contains('en_route');
                          return Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: isOnTrip ? Colors.green : Colors.orange,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isOnTrip ? 'On Trip' : 'Not on Trip',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isOnTrip ? Colors.green : Colors.orange,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildNextStopSection(childId, theme, primaryColor),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _navigateToTracking(childId),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                icon: const Icon(Icons.location_on),
                label: const Text(
                  'Track Child',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNextStopSection(
    String childId,
    ThemeData theme,
    Color primaryColor,
  ) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: _fetchNextStop(childId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const SizedBox(
              height: 60,
              child: Center(child: ShimmerLoadingSkeleton(
                width: 100,
                height: 20,
              )),
            ),
          );
        }

        if (snapshot.hasError || snapshot.data == null) {
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Unable to fetch next stop',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
          );
        }

        final nextStop = snapshot.data!;
        final stopName = nextStop['name'] as String? ?? 'Unknown Stop';
        final latitude = nextStop['latitude'] as double? ?? 0.0;
        final longitude = nextStop['longitude'] as double? ?? 0.0;

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.orange.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.orange,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(
                      Icons.flag,
                      color: Colors.white,
                      size: 14,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Next Stop',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          stopName,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (latitude != 0.0 && longitude != 0.0)
                FutureBuilder<String>(
                  future: _getAddressFromLatLng(latitude, longitude),
                  builder: (context, snapshot) {
                    final address = snapshot.data ?? 'Loading...';
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        address,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Future<String> _fetchTripStatus(String childId) async {
    try {
      final token = sessionController.token.value;
      final response = await http.get(
        Uri.parse('${trackify_vts.baseUrl}/parent/current-trip?childId=$childId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final jsonData = jsonDecode(response.body);
        final status = jsonData['data']?['status'] as String? ?? 'Unknown';
        return status;
      }
      return 'Unknown';
    } catch (e) {
      return 'Unknown';
    }
  }

  Future<Map<String, dynamic>?> _fetchNextStop(String childId) async {
    try {
      final token = sessionController.token.value;
      
      final tripResponse = await http.get(
        Uri.parse('${trackify_vts.baseUrl}/parent/current-trip?childId=$childId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (tripResponse.statusCode != 200) return null;

      final tripJson = jsonDecode(tripResponse.body);
      final tripId = tripJson['data']?['associated_trip_id'] as String?;

      if (tripId == null || tripId.isEmpty) return null;

      final nextStopResponse = await http.get(
        Uri.parse(
            '${trackify_vts.baseUrl}/parent/next-stop?tripId=$tripId&childId=$childId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (nextStopResponse.statusCode == 200) {
        final jsonData = jsonDecode(nextStopResponse.body);
        return jsonData['data'] as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  void _navigateToTracking(String childId) {
    Get.to(
      () => const ChildLocationTrackingPage(),
      binding: ChildLocationTrackingBinding(),
      arguments: {
        'childId': childId,
      },
    );
  }
}
