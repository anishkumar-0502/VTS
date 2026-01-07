import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SlideActionButton extends StatefulWidget {
  final String text;
  final VoidCallback onSlideCompleted;
  final Color color;
  final Color iconColor;
  final IconData icon;
  final double height;
  final double borderRadius;

  const SlideActionButton({
    super.key,
    required this.text,
    required this.onSlideCompleted,
    this.color = Colors.blue,
    this.iconColor = Colors.blue,
    this.icon = Icons.chevron_right,
    this.height = 52,
    this.borderRadius = 12,
  });

  @override
  State<SlideActionButton> createState() => _SlideActionButtonState();
}

class _SlideActionButtonState extends State<SlideActionButton> {
  double _dragValue = 0.0;
  double _maxWidth = 0.0;
  bool _submitted = false;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        _maxWidth = constraints.maxWidth;
        return Container(
          height: widget.height,
          decoration: BoxDecoration(
            color: widget.color, // Background color of the track
            borderRadius: BorderRadius.circular(widget.borderRadius),
          ),
          child: Stack(
            children: [
              // Text (centered)
              Center(
                child: Text(
                  widget.text,
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1,
                  ),
                ),
              ),

              // Draggable Slider
              Positioned(
                left: _dragValue,
                top: 2,
                bottom: 2,
                child: GestureDetector(
                  onHorizontalDragUpdate: (details) {
                    if (_submitted) return;
                    setState(() {
                      _dragValue = (_dragValue + details.delta.dx)
                          .clamp(0.0, _maxWidth - (widget.height - 4));
                    });
                  },
                  onHorizontalDragEnd: (details) {
                    if (_submitted) return;
                    
                    final threshold = _maxWidth * 0.7; // 70% threshold
                    if (_dragValue > threshold) {
                      // Completed
                      setState(() {
                        _dragValue = _maxWidth - (widget.height - 4);
                        _submitted = true;
                      });
                      widget.onSlideCompleted();
                      // Reset after delay if needed, or keeping it "submitted" depends on usage.
                      // Here we assume external state change will rebuild/replace this widget or we reset it.
                      Future.delayed(const Duration(seconds: 1), () {
                         if (mounted) {
                           setState(() {
                             _submitted = false;
                             _dragValue = 0;
                           });
                         }
                      });
                    } else {
                      // Snap back
                      setState(() {
                        _dragValue = 0.0;
                      });
                    }
                  },
                  child: Container(
                    width: widget.height - 4,
                    height: widget.height - 4,
                    margin: const EdgeInsets.only(left: 2), // small offset
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(widget.borderRadius - 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      widget.icon,
                      color: widget.iconColor,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
