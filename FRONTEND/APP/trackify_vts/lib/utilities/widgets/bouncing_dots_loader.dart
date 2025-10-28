import 'dart:math';

import 'package:flutter/material.dart';

class BouncingDotsLoader extends StatefulWidget {
  const BouncingDotsLoader({super.key, this.color = Colors.white, this.dotCount = 3});

  final Color color;
  final int dotCount;

  @override
  State<BouncingDotsLoader> createState() => _BouncingDotsLoaderState();
}

class _BouncingDotsLoaderState extends State<BouncingDotsLoader> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat();
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
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: List.generate(widget.dotCount, (index) {
            final double progress = (_controller.value + index * 0.18) % 1;
            final double offset = sin(progress * 2 * pi) * 8;
            final double scale = 0.75 + (sin(progress * 2 * pi) + 1) * 0.125;
            return Transform.translate(
              offset: Offset(0, -offset),
              child: Transform.scale(
                scale: scale,
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: widget.color,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
