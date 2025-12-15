import 'package:flutter/material.dart';

class ModernDialog extends StatelessWidget {
  final String title;
  final IconData? icon;
  final String? assetIcon;
  final Color iconColor;
  final Widget content;
  final List<Widget>? actions;
  final Color? backgroundColor;
  final double? borderRadius;

  const ModernDialog({
    super.key,
    required this.title,
    this.icon,
    this.assetIcon,
    required this.iconColor,
    required this.content,
    this.actions,
    this.backgroundColor,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? 20.0;
    final bgColor = backgroundColor ?? Colors.white;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius)),
      elevation: 12,
      backgroundColor: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(radius),
          color: bgColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildIconContainer(),
                const SizedBox(height: 16),
                _buildTitle(),
                const SizedBox(height: 16),
                content,
                if (actions != null && actions!.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _buildActions(),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildIconContainer() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            iconColor.withValues(alpha: 0.15),
            iconColor.withValues(alpha: 0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        shape: BoxShape.circle,
        border: Border.all(
          color: iconColor.withValues(alpha: 0.2),
          width: 2,
        ),
      ),
      child: assetIcon != null
          ? Image.asset(
              assetIcon!,
              color: iconColor,
              width: 32,
              height: 32,
            )
          : Icon(
              icon,
              color: iconColor,
              size: 32,
            ),
    );
  }

  Widget _buildTitle() {
    return Text(
      title,
      style: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.bold,
        color: Colors.black87,
        letterSpacing: 0.5,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildActions() {
    if (actions!.length == 1) {
      return SizedBox(
        width: double.infinity,
        height: 44,
        child: actions![0],
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < actions!.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: actions![i],
          ),
        ],
      ],
    );
  }
}

class ModernDialogButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final Color backgroundColor;
  final Color? textColor;
  final bool isOutlined;
  final IconData? icon;

  const ModernDialogButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.backgroundColor = const Color(0xFF2764FF),
    this.textColor,
    this.isOutlined = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    if (isOutlined) {
      return OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: backgroundColor, width: 2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, color: backgroundColor, size: 18),
              const SizedBox(width: 8),
            ],
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: backgroundColor,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }

    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor,
        elevation: 4,
        shadowColor: backgroundColor.withValues(alpha: 0.4),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, color: textColor ?? Colors.white, size: 18),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: textColor ?? Colors.white,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class ModernDialogContent extends StatelessWidget {
  final List<DialogContentRow> rows;
  final EdgeInsets padding;

  const ModernDialogContent({
    super.key,
    required this.rows,
    this.padding = const EdgeInsets.symmetric(horizontal: 0, vertical: 0),
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (int i = 0; i < rows.length; i++) ...[
            rows[i],
            if (i < rows.length - 1) const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }
}

class DialogContentRow extends StatelessWidget {
  final String label;
  final Widget value;
  final EdgeInsets padding;
  final bool isHighlighted;
  final Color? backgroundColor;

  const DialogContentRow({
    super.key,
    required this.label,
    required this.value,
    this.padding = const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    this.isHighlighted = false,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor ?? (isHighlighted ? const Color(0xFF2764FF).withValues(alpha: 0.08) : Colors.grey.withValues(alpha: 0.02)),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isHighlighted ? const Color(0xFF2764FF).withValues(alpha: 0.2) : Colors.grey.withValues(alpha: 0.1),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 6),
          DefaultTextStyle(
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
            child: value,
          ),
        ],
      ),
    );
  }
}

class DialogText extends StatelessWidget {
  final String text;
  final TextAlign textAlign;
  final Color? color;
  final FontWeight fontWeight;
  final double fontSize;
  final int? maxLines;

  const DialogText(
    this.text, {
    super.key,
    this.textAlign = TextAlign.center,
    this.color,
    this.fontWeight = FontWeight.w500,
    this.fontSize = 14,
    this.maxLines,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: maxLines != null ? TextOverflow.ellipsis : null,
      style: TextStyle(
        fontSize: fontSize,
        color: color ?? Colors.black87,
        fontWeight: fontWeight,
        height: 1.6,
      ),
    );
  }
}
