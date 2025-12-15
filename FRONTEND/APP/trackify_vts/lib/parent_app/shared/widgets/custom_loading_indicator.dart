import 'package:flutter/material.dart';

class CustomLoadingIndicator extends StatefulWidget {
  final Color? color;
  final double size;

  const CustomLoadingIndicator({
    Key? key,
    this.color,
    this.size = 50,
  }) : super(key: key);

  @override
  State<CustomLoadingIndicator> createState() => _CustomLoadingIndicatorState();
}

class _CustomLoadingIndicatorState extends State<CustomLoadingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = widget.color ?? theme.colorScheme.primary;

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        alignment: Alignment.center,
        children: List.generate(12, (index) {
          return RotationTransition(
            turns: Tween(begin: 0.0, end: 1.0).animate(
              CurvedAnimation(parent: _animationController, curve: Curves.linear),
            ),
            child: Align(
              alignment: Alignment.topCenter,
              child: Padding(
                padding: EdgeInsets.only(top: widget.size * 0.1),
                child: AnimatedBuilder(
                  animation: _animationController,
                  builder: (context, child) {
                    final normalizedValue = _animationController.value;
                    final delayedValue = (normalizedValue - (index / 12)) % 1.0;
                    final opacity = delayedValue < 0.25
                        ? 0.2 + (delayedValue / 0.25) * 0.8
                        : delayedValue < 0.75
                            ? 1.0
                            : 0.2 + ((1.0 - delayedValue) / 0.25) * 0.8;

                    return Opacity(
                      opacity: opacity,
                      child: Container(
                        width: widget.size * 0.15,
                        height: widget.size * 0.15,
                        decoration: BoxDecoration(
                          color: primaryColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}
