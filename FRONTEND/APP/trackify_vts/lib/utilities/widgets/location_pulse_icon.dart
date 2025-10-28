import 'dart:math';

import 'package:flutter/material.dart';

class LocationPulseIcon extends StatefulWidget {
  const LocationPulseIcon({
    super.key,
    this.size = 44,
    this.color = Colors.white,
    this.delay = Duration.zero,
    this.icon,
  });

  final double size;
  final Color color;
  final Duration delay;
  final IconData? icon;

  @override
  State<LocationPulseIcon> createState() => _LocationPulseIconState();
}

class _LocationPulseIconState extends State<LocationPulseIcon> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800));
    _controller.forward(from: widget.delay.inMilliseconds / 1800.0);
    _controller.repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final double progress = (_controller.value * 2 * pi);
        final double scale = 0.85 + (sin(progress) + 1) * 0.1;
        final double blurOpacity = (0.5 + (sin(progress) + 1) * 0.25).clamp(0.0, 1.0);
        return Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: widget.size * 1.6,
              height: widget.size * 1.6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    widget.color.withValues(alpha: blurOpacity * 0.4),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            Transform.scale(
              scale: scale,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: widget.color,
                  shape: BoxShape.circle,
                ),
                child: SizedBox.square(
                  dimension: widget.size,
                  child: Icon(
                    widget.icon ?? Icons.location_on_rounded,
                    color: Colors.blue[900],
                    size: widget.size * 0.6,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
