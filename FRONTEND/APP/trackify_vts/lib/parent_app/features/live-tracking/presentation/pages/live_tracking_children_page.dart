import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:geocoding/geocoding.dart';

import '../../../../../core/core.dart';
import '../controllers/live_tracking_children_controller.dart';
import '../bindings/child_location_tracking_binding.dart';
import 'child_location_tracking_page.dart';
import '../../../../shared/index.dart';
import '../../../../shared/widgets/shimmer_skeletons.dart';

class LiveTrackingChildrenPage extends GetView<LiveTrackingChildrenController> {
  const LiveTrackingChildrenPage({super.key});

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

    // Ensure controller is initialized
    if (!Get.isRegistered<LiveTrackingChildrenController>()) {
      Get.put(LiveTrackingChildrenController());
    }

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
      body: Obx(() {
        if (controller.isLoading.value) {
          return const LiveTrackingListSkeleton();
        }

        if (controller.errorMessage.value.isNotEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline,
                      color: Colors.red.shade700, size: 48),
                  const SizedBox(height: 16),
                  Text(
                    controller.errorMessage.value,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: Colors.red.shade700, fontSize: 14),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: controller.fetchProfile,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        }

        return _buildChildrenList(theme, primaryColor);
      }),
    );
  }

  Widget _buildChildrenList(ThemeData theme, Color primaryColor) {
    final profileData = controller.profileData.value;
    final associatedUsers =
        (profileData?['associated_users'] as List?) ?? [];
    final endUserId = profileData?['end_user_id'] as String? ?? '';

    if (associatedUsers.isEmpty && endUserId.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.person_off_rounded, size: 64, color: primaryColor),
            ),
            const SizedBox(height: 24),
            Text(
              'No Children Linked',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'There are no children associated with your account yet.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: controller.fetchProfile,
      color: primaryColor,
      backgroundColor: Colors.white,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        itemCount: associatedUsers.length,
        separatorBuilder: (context, index) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          final user = associatedUsers[index];
          return _buildChildCard(
            name: user['name'] as String? ?? 'Unknown',
            childId: user['id'] as String? ?? endUserId,
            theme: theme,
            primaryColor: primaryColor,
          );
        },
      ),
    );
  }

  Widget _buildChildCard({
    required String name,
    required String childId,
    required ThemeData theme,
    required Color primaryColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(
          color: primaryColor.withValues(alpha: 0.15),
          width: 1.2,
        ),
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: primaryColor.withValues(alpha: 0.2), width: 2),
                  ),
                  child: CircleAvatar(
                    radius: 28,
                    backgroundColor: primaryColor.withValues(alpha: 0.1),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: TextStyle(
                        color: primaryColor,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(height: 6),
                      FutureBuilder<String>(
                        future: controller.fetchTripStatus(childId),
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.waiting) {
                            return ShimmerLoadingSkeleton(width: 80, height: 16);
                          }
                          final status = snapshot.data ?? 'Unknown';
                          final isOnTrip = status.contains('on trip') ||
                              status.contains('On Trip') ||
                              status.toLowerCase().contains('en_route');
                          
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isOnTrip 
                                ? Colors.green.withValues(alpha: 0.1) 
                                : Colors.orange.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
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
                                    color: isOnTrip ? Colors.green[700] : Colors.orange[800],
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                Material(
                  color: primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => _navigateToTracking(childId),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Icon(
                        Icons.arrow_forward_ios_rounded,
                        color: primaryColor,
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          Container(
            height: 1,
            color: Colors.grey[100],
          ),
          
          Padding(
            padding: const EdgeInsets.all(20),
            child: _buildNextStopSection(childId, theme, primaryColor),
          ),
        ],
      ),
    );
  }

  Widget _buildNextStopSection(
    String childId,
    ThemeData theme,
    Color primaryColor,
  ) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: controller.fetchNextStop(childId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Row(
            children: [
              ShimmerLoadingSkeleton(width: 40, height: 40, borderRadius: 12),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ShimmerLoadingSkeleton(width: 80, height: 12),
                  const SizedBox(height: 6),
                  ShimmerLoadingSkeleton(width: 120, height: 16),
                ],
              ),
            ],
          );
        }

        if (snapshot.hasError || snapshot.data == null) {
          return Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.location_off_rounded, size: 20, color: Colors.grey[400]),
              ),
              const SizedBox(width: 12),
              Text(
                'Next stop information unavailable',
                style: TextStyle(color: Colors.grey[500], fontSize: 13),
              ),
            ],
          );
        }

        final nextStop = snapshot.data!;
        final stopName = nextStop['name'] as String? ?? 'Unknown Stop';
        final latitude = nextStop['latitude'] as double? ?? 0.0;
        final longitude = nextStop['longitude'] as double? ?? 0.0;

        return Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4E5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFFE0B2)),
              ),
              child: const Icon(
                Icons.flag_rounded,
                color: Color(0xFFFF9800),
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'NEXT STOP',
                    style: TextStyle(
                      fontSize: 11,
                      color: Color(0xFF9E9E9E),
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    stopName,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  if (latitude != 0.0 && longitude != 0.0)
                    FutureBuilder<String>(
                      future: _getAddressFromLatLng(latitude, longitude),
                      builder: (context, snapshot) {
                        if (!snapshot.hasData) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            snapshot.data!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
          ],
        );
      },
    );
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
