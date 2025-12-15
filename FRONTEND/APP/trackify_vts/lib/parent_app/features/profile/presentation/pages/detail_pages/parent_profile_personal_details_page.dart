  import 'package:flutter/material.dart';
  import '../../../domain/models/parent_profile_model.dart';

  // Helper function to get initials for the avatar
  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty) {
      return parts[0][0].toUpperCase();
    }
    return '';
  }

  // Define the base background color 
  const Color _kBackgroundColor = Color(0xFFF7F8FA);

  class ParentProfilePersonalDetailsPage extends StatelessWidget {
    final ParentProfileData data;

    const ParentProfilePersonalDetailsPage({required this.data, super.key});

    double _calculateFontSize({
      required String text,
      required double availableWidth,
      required TextStyle baseStyle,
    }) {
      const minFontSize = 10.0;
      const maxFontSize = 15.0;
      
      for (double fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 0.5) {
        final textPainter = TextPainter(
          text: TextSpan(text: text, style: baseStyle.copyWith(fontSize: fontSize)),
          textDirection: TextDirection.ltr,
        )..layout();
        
        if (textPainter.width <= availableWidth) {
          return fontSize;
        }
      }
      return minFontSize;
    }

    Widget _buildDataRow({
      required String label,
      required String value,
      required Color primaryColor,
      Color? accentColor,
      bool autoScaleFont = false,
    }) {
      final effectiveAccent = accentColor?.withOpacity(0.85) ?? primaryColor.withOpacity(0.9);

      return Padding(
        padding: const EdgeInsets.only(bottom: 12.0),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.grey.shade200, width: 0.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03), 
                blurRadius: 5,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              SizedBox(
                width: 120,
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
              const VerticalDivider(color: Colors.grey, thickness: 1, width: 20, endIndent: 5, indent: 5),
              Expanded(
                child: autoScaleFont
                    ? LayoutBuilder(
                        builder: (context, constraints) {
                          final baseStyle = TextStyle(
                            fontWeight: FontWeight.w600,
                            fontFamily: 'RobotoMono',
                            color: effectiveAccent,
                          );
                          
                          final fontSize = _calculateFontSize(
                            text: value,
                            availableWidth: constraints.maxWidth,
                            baseStyle: baseStyle,
                          );
                          
                          return Text(
                            value,
                            style: baseStyle.copyWith(fontSize: fontSize),
                            textAlign: TextAlign.right,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          );
                        },
                      )
                    : Text(
                        value,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600, 
                          fontFamily: 'RobotoMono', 
                          color: effectiveAccent, 
                        ),
                        textAlign: TextAlign.right,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
              ),
            ],
          ),
        ),
      );
    }

    @override
    Widget build(BuildContext context) {
      final theme = Theme.of(context);
      final primaryColor = theme.colorScheme.primary;
      final errorColor = Colors.red.shade600;

      final sosContactName = data.sosContact?.name ?? 'Not Set';
      final sosContactPhone = data.sosContact?.phoneNumber.toString() ?? 'N/A';
      final isSosMissing = sosContactName == 'Not Set' || sosContactPhone == 'N/A';
      final activeStatusColor = data.status ? Colors.green.shade700 : errorColor;

      return Scaffold(
        backgroundColor: _kBackgroundColor, 
        appBar: AppBar(
          title: const Text(
            'My Profile Details',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          ),
          backgroundColor: primaryColor,
          centerTitle: true,
          elevation: 0,
          iconTheme: const IconThemeData(color: Colors.white),
        ),

        // ---------------- INVISIBLE SCROLL ----------------
        body: ScrollConfiguration(
          behavior: const ScrollBehavior().copyWith(scrollbars: false),
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 30), 
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 40, 
                        backgroundColor: primaryColor,
                        child: Text(
                          _getInitials(data.name),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        data.name,
                        style: const TextStyle(
                          color: Colors.black87,
                          fontSize: 22, 
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        data.roleName, 
                        style: TextStyle(
                          color: primaryColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 35),

                // CONTACT INFORMATION
                Text(
                  'CONTACT INFORMATION', 
                  style: TextStyle(
                    color: Colors.grey[700], 
                    fontWeight: FontWeight.w800, 
                    fontSize: 14,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 15), 

                // _buildDataRow(
                //   label: 'Email Address',
                //   value: data.email,
                //   primaryColor: primaryColor,
                //   autoScaleFont: true,
                // ),

                Text(
  'Email Address',
  style: TextStyle(
    fontSize: 13,
    color: Colors.grey[600],
    fontWeight: FontWeight.w500,
    letterSpacing: 0.2,
  ),
),
const SizedBox(height: 6),
Container(
  width: double.infinity,
  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(10),
    border: Border.all(color: Colors.grey.shade200, width: 0.5),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.03),
        blurRadius: 5,
        offset: const Offset(0, 2),
      ),
    ],
  ),
  child: Text(
    data.email,
    style: TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      fontFamily: 'RobotoMono',
      color: primaryColor,
    ),
  ),
),
const SizedBox(height: 12),


                _buildDataRow(
                  label: 'Mobile Number',
                  value: data.phoneNumber.toString(),
                  primaryColor: primaryColor,
                ),

                const SizedBox(height: 25),

                // EMERGENCY CONTACT
                Text(
                  'EMERGENCY CONTACT (SOS)', 
                  style: TextStyle(
                    color: errorColor, 
                    fontWeight: FontWeight.w800, 
                    fontSize: 14,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 15), 

                _buildDataRow(
                  label: 'Contact Name',
                  value: sosContactName,
                  primaryColor: primaryColor,
                  accentColor: errorColor,
                ),

                _buildDataRow(
                  label: 'Phone Number',
                  value: sosContactPhone,
                  primaryColor: primaryColor,
                  accentColor: errorColor,
                ),

                if (isSosMissing) ...[
                  const SizedBox(height: 15),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14), 
                    decoration: BoxDecoration(
                      color: Colors.red.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: errorColor.withOpacity(0.7), width: 1.5),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: errorColor, size: 24), 
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'CRITICAL: Emergency contact details are incomplete and should be updated.',
                            style: TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 25),

                // ACCOUNT DETAILS
                Text(
                  'ACCOUNT & SERVICE INFO', 
                  style: TextStyle(
                    color: Colors.grey[700], 
                    fontWeight: FontWeight.w800, 
                    fontSize: 14,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 15), 

                _buildDataRow(
                  label: 'Service Provider',
                  value: data.operatorDetails?.name ?? 'N/A',
                  primaryColor: primaryColor,
                ),

                _buildDataRow(
                  label: 'Account Status',
                  value: data.status ? 'Active' : 'Inactive',
                  primaryColor: primaryColor,
                  accentColor: activeStatusColor,
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      );
    }
  }
