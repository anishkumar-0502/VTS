import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/driver_live_tracking_controller.dart';

class DriverLiveTrackingPage extends GetView<DriverLiveTrackingController> {
  const DriverLiveTrackingPage({super.key});

  @override
  String? get tag => 'driver_live_tracking';

  @override
  Widget build(BuildContext context) {
    final Color primaryColor = Theme.of(context).colorScheme.primary;
    return Obx(() {
      if (controller.isMapFullscreen.value) {
        return _FullscreenMapView(controller: controller, primaryColor: primaryColor);
      }
      
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
                      const Text('All Stops',
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
                          children: controller.stops
                              .asMap()
                              .entries
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
                                      '${entry.key + 1}',
                                      style: TextStyle(
                                        color: primaryColor,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  title: Text(
                                    entry.value,
                                    style: const TextStyle(
                                        fontSize: 15, fontWeight: FontWeight.w600),
                                  ),
                                  trailing: Icon(Icons.location_on, color: primaryColor),
                                ),
                              )
                              .toList(),
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
        },
      );
    });
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
                CustomPaint(
                  painter: _MapBackdropPainter(
                    primaryColor: primaryColor,
                    stops: points,
                  ),
                ),
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
                Positioned(
                  left: busOffset.dx - 18,
                  top: busOffset.dy - 24,
                  child: _BusMarker(color: primaryColor),
                ),
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
                Positioned(
                  right: 20,
                  top: 20,
                  child: GestureDetector(
                    onTap: controller.toggleMapFullscreen,
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.92),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.fullscreen,
                        color: primaryColor,
                        size: 24,
                      ),
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
  _MapBackdropPainter({required this.primaryColor, required this.stops});

  final Color primaryColor;
  final List<Offset> stops;

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

    for (final stop in stops) {
      canvas.drawCircle(stop, 9, stopPaint);
      canvas.drawCircle(stop, 9, stopBorder);
    }
  }

  @override
  bool shouldRepaint(covariant _MapBackdropPainter oldDelegate) {
    return oldDelegate.primaryColor != primaryColor || oldDelegate.stops != stops;
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

class _FullscreenMapView extends StatelessWidget {
  const _FullscreenMapView({required this.controller, required this.primaryColor});

  final DriverLiveTrackingController controller;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          SingleChildScrollView(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1400),
                child: Column(
                  children: [
                    SizedBox(
                      height: MediaQuery.of(context).size.height * 0.85,
                      child: _FullscreenLiveTrackingMap(
                        controller: controller,
                        primaryColor: primaryColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 20,
            top: 20,
            child: GestureDetector(
              onTap: controller.toggleMapFullscreen,
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.92),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Icon(
                  Icons.fullscreen_exit,
                  color: primaryColor,
                  size: 24,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FullscreenLiveTrackingMap extends StatelessWidget {
  const _FullscreenLiveTrackingMap({required this.controller, required this.primaryColor});

  final DriverLiveTrackingController controller;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    final double mapWidth = MediaQuery.of(context).size.width;
    final double mapHeight = MediaQuery.of(context).size.height;
    
    final points = [
      Offset(mapWidth * 0.1, mapHeight * 0.78),
      Offset(mapWidth * 0.35, mapHeight * 0.6),
      Offset(mapWidth * 0.58, mapHeight * 0.38),
      Offset(mapWidth * 0.82, mapHeight * 0.22),
    ];
    final Offset busOffset = _positionAlongPath(points, controller.routeProgress.value.clamp(0.0, 1.0));

    return SizedBox(
      width: mapWidth,
      height: mapHeight,
      child: Stack(
        fit: StackFit.expand,
        children: [
          CustomPaint(
            painter: _MapBackdropPainter(
              primaryColor: primaryColor,
              stops: points,
            ),
          ),
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
          Positioned(
            left: busOffset.dx - 18,
            top: busOffset.dy - 24,
            child: _BusMarker(color: primaryColor),
          ),
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
