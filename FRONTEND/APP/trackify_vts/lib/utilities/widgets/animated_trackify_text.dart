import 'package:flutter/material.dart';

class AnimatedTrackifyText extends StatefulWidget {
  const AnimatedTrackifyText({
    super.key,
    this.text = 'Trackit',
    this.style,
    this.duration = const Duration(milliseconds: 1800),
  });

  final String text;
  final TextStyle? style;
  final Duration duration;

  @override
  State<AnimatedTrackifyText> createState() => _AnimatedTrackifyTextState();
}

class _AnimatedTrackifyTextState extends State<AnimatedTrackifyText>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late List<Animation<double>> _opacityAnimations;
  late List<Animation<Offset>> _slideAnimations;
  late List<Animation<double>> _scaleAnimations;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration)
      ..repeat(reverse: true);
    _buildAnimations();
  }

  @override
  void didUpdateWidget(covariant AnimatedTrackifyText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text || oldWidget.duration != widget.duration) {
      _controller.duration = widget.duration;
      _buildAnimations();
      _controller
        ..reset()
        ..repeat(reverse: true);
    }
  }

  void _buildAnimations() {
    final letters = widget.text.characters.toList();
    final int count = letters.length;
    final double segment = 1 / (count + 1);
    _opacityAnimations = List.generate(count, (index) {
      final double start = segment * index;
      final double end = (start + segment * 2).clamp(0.0, 1.0);
      return Tween<double>(begin: index.isEven ? 0.4 : 0.2, end: 1).animate(
        CurvedAnimation(
          parent: _controller,
          curve: Interval(start, end, curve: Curves.easeInOutCubic),
        ),
      );
    });
    _slideAnimations = List.generate(count, (index) {
      final double start = segment * index;
      final double end = (start + segment * 2).clamp(0.0, 1.0);
      return Tween<Offset>(begin: Offset(0, index.isEven ? 0.4 : 0.6), end: Offset.zero).animate(
        CurvedAnimation(
          parent: _controller,
          curve: Interval(start, end, curve: Curves.easeInOutCubic),
        ),
      );
    });
    _scaleAnimations = List.generate(count, (index) {
      final double start = segment * index;
      final double end = (start + segment * 2).clamp(0.0, 1.0);
      return Tween<double>(begin: 0.88, end: 1.08).animate(
        CurvedAnimation(
          parent: _controller,
          curve: Interval(start, end, curve: Curves.easeInOutBack),
        ),
      );
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final letters = widget.text.characters.toList();
    final TextStyle resolvedStyle = widget.style ??
        const TextStyle(
          fontSize: 42,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        );

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(letters.length, (index) {
        return ScaleTransition(
          scale: _scaleAnimations[index],
          child: SlideTransition(
            position: _slideAnimations[index],
            child: FadeTransition(
              opacity: _opacityAnimations[index],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2.5),
                child: Text(letters[index], style: resolvedStyle),
              ),
            ),
          ),
        );
      }),
    );
  }
}
