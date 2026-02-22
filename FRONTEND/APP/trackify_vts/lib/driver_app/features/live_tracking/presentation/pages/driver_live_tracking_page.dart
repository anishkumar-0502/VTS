import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/driver_live_tracking_controller.dart';

class DriverLiveTrackingPage extends StatefulWidget {
  const DriverLiveTrackingPage({super.key});

  @override
  State<DriverLiveTrackingPage> createState() => _DriverLiveTrackingPageState();
}

class _DriverLiveTrackingPageState extends State<DriverLiveTrackingPage> {
  late DriverLiveTrackingController controller;

  @override
  void initState() {
    super.initState();
    print('📱 DriverLiveTrackingPage.initState() called');
    if (!Get.isRegistered<DriverLiveTrackingController>(tag: 'driver_live_tracking')) {
      Get.put(DriverLiveTrackingController(), tag: 'driver_live_tracking');
    }
    controller = Get.find<DriverLiveTrackingController>(tag: 'driver_live_tracking');
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _setupActiveTripWatcher();
    });
  }

  void _setupActiveTripWatcher() {
    print('📱 _setupActiveTripWatcher() called');
    try {
      final scheduledTripsController = Get.find(tag: 'scheduled_trips');
      print('📱 Found scheduledTripsController');
      
      ever(scheduledTripsController.activeTrip, (activeTrip) {
        if (activeTrip != null) {
          print('🔥 FORCE APPLY ACTIVE TRIP (From Watcher)');
          controller.setActiveTripData(activeTrip);
        }
      });
      
      if (scheduledTripsController.activeTrip.value != null) {
        print('🔥 FORCE APPLY ACTIVE TRIP (Initial Check)');
        controller.setActiveTripData(scheduledTripsController.activeTrip.value);
      }
    } catch (e) {
      print('❌ Could not setup active trip watcher: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;
    return LayoutBuilder(
      builder: (context, constraints) {
        final double width = constraints.maxWidth;
        final double horizontalPadding = width >= 1100
            ? 64
            : width >= 900
                ? 48
                : width >= 600
                    ? 28
                    : 16;

        return Obx(() {
          return ListView(
            padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 20),
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 980),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _LiveTrackingMap(
                        controller: controller,
                        primaryColor: primaryColor,
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 12,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 18,
                              runSpacing: 18,
                              children: [
                                _MetricTile(
                                  icon: Icons.speed,
                                  label: 'Speed',
                                  value: controller.currentSpeed.value,
                                  color: primaryColor,
                                ),
                                _MetricTile(
                                  icon: Icons.gps_fixed,
                                  label: 'GPS',
                                  value: controller.gpsSignal.value,
                                  color: Colors.greenAccent,
                                ),
                                _MetricTile(
                                  icon: Icons.battery_full,
                                  label: 'Tablet',
                                  value: controller.batteryStatus.value,
                                  color: Colors.teal,
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  Row(
                                    children: const [
                                      Icon(Icons.cloud_done, color: Colors.green, size: 18),
                                      SizedBox(width: 8),
                                      Text('Live updates enabled',
                                          style: TextStyle(fontSize: 13, color: Colors.black54)),
                                    ],
                                  ),
                                  const Spacer(),
                                  TextButton(onPressed: () {}, child: const Text('Refresh')),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text('Timeline',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          children: controller.locationTimeline
                              .map(
                                (entry) => ListTile(
                                  contentPadding:
                                      const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                  leading: Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: primaryColor.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      entry['time'] ?? '',
                                      style: TextStyle(
                                        color: primaryColor,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  title: Text(
                                    entry['event'] ?? '',
                                    style: const TextStyle(
                                        fontSize: 15, fontWeight: FontWeight.w600),
                                  ),
                                  trailing: Icon(Icons.check_circle, color: primaryColor),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        });
      },
    );
  }
}

class _LiveTrackingMap extends StatelessWidget {
  const _LiveTrackingMap({required this.controller, required this.primaryColor});

  final DriverLiveTrackingController controller;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double mapWidth = constraints.maxWidth;
        final double mapHeight = mapWidth >= 900
            ? 320
            : mapWidth >= 600
                ? 280
                : 240;
        final points = [
          Offset(mapWidth * 0.1, mapHeight * 0.78),
          Offset(mapWidth * 0.35, mapHeight * 0.6),
          Offset(mapWidth * 0.58, mapHeight * 0.38),
          Offset(mapWidth * 0.82, mapHeight * 0.22),
        ];
        final Offset busOffset = _positionAlongPath(points, controller.routeProgress.value.clamp(0.0, 1.0));

        return SizedBox(
          height: mapHeight,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Obx(() {
                  return CustomPaint(
                    painter: _MapBackdropPainter(
                      primaryColor: primaryColor,
                      stops: points,
                      startLocation: controller.startLocation.value,
                      endLocation: controller.endLocation.value,
                      routePoints: controller.routePoints,
                    ),
                  );
                }),
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.white.withOpacity(0.0),
                          Colors.white.withOpacity(0.05),
                          Colors.black.withOpacity(0.25),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 20,
                  right: 20,
                  top: 20,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.92),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: primaryColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Icon(Icons.directions_bus, color: primaryColor),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Bus 18 • Morning Route A',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'ETA ${controller.estimatedArrival.value}',
                                style: const TextStyle(fontSize: 13, color: Colors.black54),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            controller.tripStatus.value,
                            style: TextStyle(
                              color: primaryColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Obx(() {
                  if (controller.isTripActive.value && controller.isSocketConnected.value) {
                    return Positioned(
                      left: busOffset.dx - 18,
                      top: busOffset.dy - 24,
                      child: _BusMarker(color: primaryColor),
                    );
                  }
                  return const SizedBox.shrink();
                }),
                Positioned(
                  left: 20,
                  right: 20,
                  bottom: 20,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        LinearProgressIndicator(
                          value: controller.routeProgress.value,
                          backgroundColor: Colors.grey.shade300,
                          color: Colors.greenAccent,
                          minHeight: 8,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${(controller.routeProgress.value * 100).round()}% of route completed',
                          style: const TextStyle(fontSize: 12, color: Colors.black54),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Offset _positionAlongPath(List<Offset> points, double progress) {
    if (points.length < 2) return Offset.zero;
    final totalSegments = points.length - 1;
    final scaled = progress * totalSegments;
    final index = scaled.floor().clamp(0, totalSegments - 1);
    final localT = scaled - index;
    final start = points[index];
    final end = points[index + 1];
    return Offset.lerp(start, end, localT) ?? end;
  }
}

class _MapBackdropPainter extends CustomPainter {
  _MapBackdropPainter({
    required this.primaryColor,
    required this.stops,
    this.startLocation,
    this.endLocation,
    this.routePoints = const [],
  });

  final Color primaryColor;
  final List<Offset> stops;
  final dynamic startLocation;
  final dynamic endLocation;
  final List<dynamic> routePoints;

  Offset _latLngToOffset(double lat, double lng, Size size, double minLat, double maxLat, double minLng, double maxLng) {
    final padding = 40.0;
    final availableWidth = size.width - (2 * padding);
    final availableHeight = size.height - (2 * padding);

    final latRange = maxLat - minLat;
    final lngRange = maxLng - minLng;

    if (latRange == 0 || lngRange == 0) {
      return Offset(size.width / 2, size.height / 2);
    }

    final x = padding + ((lng - minLng) / lngRange) * availableWidth;
    final y = padding + ((maxLat - lat) / latRange) * availableHeight;

    return Offset(x, y);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final background = Paint()..color = const Color(0xFFEAF1FF);
    canvas.drawRect(Offset.zero & size, background);

    final gridPaint = Paint()
      ..color = const Color(0xFFD1DBF2)
      ..strokeWidth = 1;

    for (double x = 0; x <= size.width; x += 60) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y <= size.height; y += 60) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final routeShadow = Paint()
      ..color = primaryColor.withOpacity(0.2)
      ..strokeWidth = 10
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final routePaint = Paint()
      ..color = primaryColor
      ..strokeWidth = 6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    bool useRealCoordinates = startLocation != null && endLocation != null;

    if (useRealCoordinates) {
      print('🚨 ROUTE POINT COUNT BEFORE DRAW: ${routePoints.length}');
      print('🗺️ Paint: Start(${startLocation.latitude}, ${startLocation.longitude}), End(${endLocation.latitude}, ${endLocation.longitude}), Points: ${routePoints.length}');
      
      final filteredRoutePoints = routePoints.where((p) => p.latitude != 0 && p.longitude != 0).toList();
      
      var intermediatePoints = filteredRoutePoints;
      
      if (intermediatePoints.isNotEmpty && endLocation != null) {
        final lastPoint = intermediatePoints.last;
        final isLastPointEndLocation = 
            (lastPoint.latitude - endLocation.latitude).abs() < 0.0001 &&
            (lastPoint.longitude - endLocation.longitude).abs() < 0.0001;
        
        if (isLastPointEndLocation) {
          intermediatePoints = filteredRoutePoints.sublist(0, filteredRoutePoints.length - 1);
          print('🗺️ Excluded last route point (matches end location)');
        }
      }
      
      print('🗺️ Using BACKEND END_LOCATION: (${endLocation.latitude}, ${endLocation.longitude})');
      
      final allCoords = [
        (startLocation.latitude as double, startLocation.longitude as double),
        if (intermediatePoints.isNotEmpty) ...intermediatePoints.map((p) => (p.latitude as double, p.longitude as double)),
        (endLocation.latitude as double, endLocation.longitude as double),
      ];
      
      print('🗺️ AllCoords: $allCoords, Intermediate Points: ${intermediatePoints.length}');

      if (allCoords.isEmpty) {
        print('❌ No valid coordinates to plot');
        canvas.drawRect(Offset.zero & size, background);
        return;
      }

      double minLat = allCoords.map((c) => c.$1).reduce((a, b) => a < b ? a : b);
      double maxLat = allCoords.map((c) => c.$1).reduce((a, b) => a > b ? a : b);
      double minLng = allCoords.map((c) => c.$2).reduce((a, b) => a < b ? a : b);
      double maxLng = allCoords.map((c) => c.$2).reduce((a, b) => a > b ? a : b);
      
      print('🗺️ Raw Bounds - Lat: [$minLat, $maxLat], Lng: [$minLng, $maxLng]');

      const latBuffer = 0.0005;
      const lngBuffer = 0.0005;
      minLat = (minLat - latBuffer).clamp(-90.0, 90.0);
      maxLat = (maxLat + latBuffer).clamp(-90.0, 90.0);
      minLng = (minLng - lngBuffer).clamp(-180.0, 180.0);
      maxLng = (maxLng + lngBuffer).clamp(-180.0, 180.0);
      
      print('🗺️ Final Bounds - Lat: [$minLat, $maxLat], Lng: [$minLng, $maxLng]');

      final startOffset = _latLngToOffset(
        startLocation.latitude as double,
        startLocation.longitude as double,
        size,
        minLat,
        maxLat,
        minLng,
        maxLng,
      );
      
      print('🟢 START MARKER - Lat: ${startLocation.latitude}, Lng: ${startLocation.longitude} → Canvas Offset: $startOffset');

      final endOffset = _latLngToOffset(
        endLocation.latitude as double,
        endLocation.longitude as double,
        size,
        minLat,
        maxLat,
        minLng,
        maxLng,
      );
      
      print('🔴 END MARKER - Lat: ${endLocation.latitude}, Lng: ${endLocation.longitude} → Canvas Offset: $endOffset');

      final routeOffsets = intermediatePoints
          .map((p) => _latLngToOffset(
            p.latitude as double,
            p.longitude as double,
            size,
            minLat,
            maxLat,
            minLng,
            maxLng,
          ))
          .toList();

      final path = Path()..moveTo(startOffset.dx, startOffset.dy);
      for (final offset in routeOffsets) {
        path.lineTo(offset.dx, offset.dy);
      }
      path.lineTo(endOffset.dx, endOffset.dy);

      canvas.drawPath(path, routeShadow);

      for (final metric in path.computeMetrics()) {
        double distance = 0;
        const double dashLength = 18;
        const double gapLength = 12;
        while (distance < metric.length) {
          final double next = (distance + dashLength).clamp(0, metric.length);
          final segment = metric.extractPath(distance, next);
          canvas.drawPath(segment, routePaint);
          distance = next + gapLength;
        }
      }

      final markerPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;

      canvas.drawCircle(startOffset, 10, markerPaint);
      canvas.drawCircle(
        startOffset,
        10,
        Paint()
          ..color = Colors.green
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3,
      );

      for (int i = 0; i < routeOffsets.length; i++) {
        final offset = routeOffsets[i];
        canvas.drawCircle(offset, 8, markerPaint);
        canvas.drawCircle(
          offset,
          8,
          Paint()
            ..color = primaryColor
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2,
        );

        final textPainter = TextPainter(
          text: TextSpan(
            text: '${i + 1}',
            style: const TextStyle(
              color: Color(0xFF3366FF),
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
          textDirection: TextDirection.ltr,
        );
        textPainter.layout();
        textPainter.paint(
          canvas,
          Offset(offset.dx - textPainter.width / 2, offset.dy - textPainter.height / 2),
        );
      }
      
      print('🗺️ Drew ${routeOffsets.length} intermediate stop markers');

      canvas.drawCircle(endOffset, 10, markerPaint);
      canvas.drawCircle(
        endOffset,
        10,
        Paint()
          ..color = Colors.red
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3,
      );

      print('🔍 DEBUG: startOffset=$startOffset, endOffset=$endOffset');
      print('🔍 DEBUG: Canvas size=${size.width}x${size.height}');
      
      final debugCircleStart = Paint()
        ..color = Colors.yellow
        ..style = PaintingStyle.fill;
      final debugCircleEnd = Paint()
        ..color = Colors.orange
        ..style = PaintingStyle.fill;
      
      canvas.drawCircle(startOffset, 8, debugCircleStart);
      canvas.drawCircle(endOffset, 8, debugCircleEnd);
      
      final debugTextStyle = TextStyle(
        color: Colors.white,
        fontSize: 11,
        fontWeight: FontWeight.bold,
        backgroundColor: Colors.red,
      );
      
      final startDebugPainter = TextPainter(
        text: TextSpan(
          text: 'S:${startLocation.latitude.toStringAsFixed(3)},${startLocation.longitude.toStringAsFixed(3)}',
          style: debugTextStyle,
        ),
        textDirection: TextDirection.ltr,
      );
      startDebugPainter.layout();
      startDebugPainter.paint(canvas, Offset(startOffset.dx - 80, startOffset.dy - 30));
      
      final endDebugPainter = TextPainter(
        text: TextSpan(
          text: 'E:${endLocation.latitude.toStringAsFixed(3)},${endLocation.longitude.toStringAsFixed(3)}',
          style: TextStyle(
            color: Colors.white,
            fontSize: 11,
            fontWeight: FontWeight.bold,
            backgroundColor: Colors.redAccent,
          ),
        ),
        textDirection: TextDirection.ltr,
      );
      endDebugPainter.layout();
      endDebugPainter.paint(canvas, Offset(endOffset.dx - 80, endOffset.dy + 10));
      
      final boundsDebugPainter = TextPainter(
        text: TextSpan(
          text: 'L:${minLat.toStringAsFixed(4)} L:${maxLat.toStringAsFixed(4)} Ln:${minLng.toStringAsFixed(4)} Ln:${maxLng.toStringAsFixed(4)}',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.bold,
            backgroundColor: Colors.blue,
          ),
        ),
        textDirection: TextDirection.ltr,
      );
      boundsDebugPainter.layout();
      boundsDebugPainter.paint(canvas, Offset(5, 5));
      
    } else {
      final controlPoints = [
        stops.first,
        Offset(size.width * 0.32, size.height * 0.55),
        Offset(size.width * 0.48, size.height * 0.35),
        stops.last,
      ];

      final path = Path()
        ..moveTo(stops.first.dx, stops.first.dy)
        ..cubicTo(
          controlPoints[1].dx,
          controlPoints[1].dy,
          controlPoints[2].dx,
          controlPoints[2].dy,
          stops.last.dx,
          stops.last.dy,
        );

      canvas.drawPath(path, routeShadow);

      for (final metric in path.computeMetrics()) {
        double distance = 0;
        const double dashLength = 18;
        const double gapLength = 12;
        while (distance < metric.length) {
          final double next = (distance + dashLength).clamp(0, metric.length);
          final segment = metric.extractPath(distance, next);
          canvas.drawPath(segment, routePaint);
          distance = next + gapLength;
        }
      }

      final stopPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      final stopBorder = Paint()
        ..color = primaryColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3;

      for (int i = 0; i < stops.length; i++) {
        final stop = stops[i];
        canvas.drawCircle(stop, 9, stopPaint);
        final border = i == 0
            ? (Paint()
              ..color = Colors.green
              ..style = PaintingStyle.stroke
              ..strokeWidth = 3)
            : stopBorder;
        canvas.drawCircle(stop, 9, border);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _MapBackdropPainter oldDelegate) {
    return oldDelegate.primaryColor != primaryColor ||
        oldDelegate.stops != stops ||
        oldDelegate.startLocation != startLocation ||
        oldDelegate.endLocation != endLocation ||
        oldDelegate.routePoints != routePoints;
  }
}

class _BusMarker extends StatelessWidget {
  const _BusMarker({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 48,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 10, offset: const Offset(0, 6)),
        ],
      ),
      alignment: Alignment.center,
      child: Icon(Icons.directions_bus, color: color),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.icon, required this.label, required this.value, required this.color});

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            alignment: Alignment.center,
            child: Icon(icon, color: color),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontSize: 13, color: Colors.black54)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
