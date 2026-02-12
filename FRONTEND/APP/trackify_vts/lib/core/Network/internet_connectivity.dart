import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

class InternetChecker extends StatefulWidget {
  final Widget child;
  const InternetChecker({super.key, required this.child});

  @override
  State<InternetChecker> createState() => _InternetCheckerState();
}

class _InternetCheckerState extends State<InternetChecker> {
  bool _hasConnection = true;
  bool _isChecking = false;
  String? _statusMessage;
  Color _statusColor = Colors.green;
  IconData _statusIcon = Icons.check_circle;
  Timer? _statusTimer;
  late final StreamSubscription<dynamic> _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = Connectivity().onConnectivityChanged.listen(_updateConnectionStatus);
    _checkInitialConnection();
  }

  Future<void> _checkInitialConnection() async {
    final result = await Connectivity().checkConnectivity();
    if (!mounted) {
      return;
    }
    _updateConnectionStatus(result);
  }

  void _updateConnectionStatus(dynamic result, {bool forceMessage = false}) {
    final connected = _isConnected(result);
    if (!mounted) {
      return;
    }
    final hasChanged = connected != _hasConnection;
    if (hasChanged) {
      setState(() {
        _hasConnection = connected;
      });
    } else if (!forceMessage) {
      return;
    }
    final scheme = Theme.of(context).colorScheme;
    final message = connected
        ? 'Back online'
        : forceMessage && !hasChanged
            ? 'Still offline'
            : 'You are offline';
    final color = connected ? Colors.green : scheme.error;
    final icon = connected ? Icons.check_circle : Icons.wifi_off;
    _showStatusIndicator(message, color, icon);
  }

  bool _isConnected(dynamic result) {
    if (result is Iterable<ConnectivityResult>) {
      return result.any((status) => status != ConnectivityResult.none);
    }
    if (result is ConnectivityResult) {
      return result != ConnectivityResult.none;
    }
    return false;
  }

  Future<void> _retry() async {
    if (_isChecking) {
      return;
    }
    _isChecking = true;
    final scheme = Theme.of(context).colorScheme;
    _showStatusIndicator('Checking connection...', scheme.primary, Icons.sync);
    final result = await Connectivity().checkConnectivity();
    if (mounted) {
      _updateConnectionStatus(result, forceMessage: true);
    }
    _isChecking = false;
  }

  void _showStatusIndicator(String message, Color color, IconData icon) {
    _statusTimer?.cancel();
    setState(() {
      _statusMessage = message;
      _statusColor = color;
      _statusIcon = icon;
    });
    _statusTimer = Timer(const Duration(seconds: 3), () {
      if (!mounted) {
        return;
      }
      setState(() {
        _statusMessage = null;
      });
    });
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    _subscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (!_hasConnection)
          Positioned.fill(
            child: NoInternetOverlay(onRetry: _retry),
          ),
        Positioned(
          top: 24,
          left: 16,
          right: 16,
          child: IgnorePointer(
            ignoring: _statusMessage == null,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              transitionBuilder: (child, animation) {
                final offsetAnimation = Tween<Offset>(
                  begin: const Offset(0, -0.5),
                  end: Offset.zero,
                ).animate(animation);
                return SlideTransition(
                  position: offsetAnimation,
                  child: FadeTransition(opacity: animation, child: child),
                );
              },
              child: _statusMessage == null
                  ? const SizedBox.shrink()
                  : _StatusBanner(
                      key: ValueKey(_statusMessage),
                      message: _statusMessage!,
                      color: _statusColor,
                      icon: _statusIcon,
                    ),
            ),
          ),
        ),
      ],
    );
  }
}

class NoInternetOverlay extends StatelessWidget {
  final Future<void> Function() onRetry;
  const NoInternetOverlay({super.key, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: theme.scaffoldBackgroundColor,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.wifi_off, size: 110, color: colorScheme.primary),
                const SizedBox(height: 24),
                Text(
                  'No Internet Connection',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                Text(
                  'Please check your network settings and try again.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: onRetry,
                    child: const Text('Retry'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  final String message;
  final Color color;
  final IconData icon;

  const _StatusBanner({
    super.key,
    required this.message,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final background = color.withValues(alpha: 0.12);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: color, width: 1.5),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.12),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context)
                    .textTheme
                    .bodyLarge
                    ?.copyWith(color: color, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
